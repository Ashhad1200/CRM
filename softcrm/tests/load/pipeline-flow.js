/**
 * T219 — k6 load test: Sales Pipeline Flow
 *
 * 500 virtual users execute the full sales pipeline journey:
 * create lead → convert → move stages → create quote → mark won
 *
 * Run: k6 run tests/load/pipeline-flow.js
 *
 * Targets:
 *   p95 read  < 200ms
 *   p95 write < 500ms
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics ──────────────────────────────────────────────────────

const readLatency = new Trend('read_latency', true);
const writeLatency = new Trend('write_latency', true);
const errorRate = new Rate('errors');

// ── Configuration ───────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '30s', target: 100 },  // ramp up
    { duration: '1m', target: 500 },   // ramp to full load
    { duration: '3m', target: 500 },   // sustain 500 VUs
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    read_latency: ['p(95)<200'],    // p95 reads < 200ms
    write_latency: ['p(95)<500'],   // p95 writes < 500ms
    errors: ['rate<0.01'],          // error rate < 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API = `${BASE_URL}/api/v1`;

// ── Auth helper ─────────────────────────────────────────────────────────

function login() {
  const res = http.post(`${API}/auth/login`, JSON.stringify({
    email: `loadtest-${__VU}@example.com`,
    password: 'LoadTest123!',
  }), { headers: { 'Content-Type': 'application/json' } });

  if (res.status === 200) {
    return JSON.parse(res.body).accessToken;
  }
  // Fallback: use a pre-configured token
  return __ENV.AUTH_TOKEN || '';
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// ── Main scenario ───────────────────────────────────────────────────────

export default function () {
  const token = login();
  const headers = authHeaders(token);

  let leadId, contactId, dealId, quoteId;

  group('1. Create Lead', () => {
    const res = http.post(`${API}/sales/leads`, JSON.stringify({
      firstName: `Load-${__VU}-${__ITER}`,
      lastName: 'TestLead',
      email: `lead-${__VU}-${__ITER}@loadtest.com`,
      source: 'website',
      status: 'new',
    }), { headers });

    writeLatency.add(res.timings.duration);
    const ok = check(res, { 'lead created': (r) => r.status === 201 });
    if (!ok) errorRate.add(1);
    else {
      errorRate.add(0);
      leadId = JSON.parse(res.body).id;
    }
  });

  sleep(0.5);

  group('2. List Leads', () => {
    const res = http.get(`${API}/sales/leads?page=1&limit=10`, { headers });
    readLatency.add(res.timings.duration);
    const ok = check(res, { 'leads listed': (r) => r.status === 200 });
    if (!ok) errorRate.add(1);
    else errorRate.add(0);
  });

  sleep(0.5);

  if (leadId) {
    group('3. Convert Lead', () => {
      const res = http.post(`${API}/sales/leads/${leadId}/convert`, JSON.stringify({
        createAccount: true,
        createDeal: true,
        dealName: `Deal-${__VU}-${__ITER}`,
      }), { headers });

      writeLatency.add(res.timings.duration);
      const ok = check(res, { 'lead converted': (r) => r.status === 200 || r.status === 201 });
      if (!ok) errorRate.add(1);
      else {
        errorRate.add(0);
        const body = JSON.parse(res.body);
        contactId = body.contactId;
        dealId = body.dealId;
      }
    });
  }

  sleep(0.5);

  if (dealId) {
    group('4. Get Deal', () => {
      const res = http.get(`${API}/sales/deals/${dealId}`, { headers });
      readLatency.add(res.timings.duration);
      const ok = check(res, { 'deal fetched': (r) => r.status === 200 });
      if (!ok) errorRate.add(1);
      else errorRate.add(0);
    });

    sleep(0.3);

    group('5. Move Deal Stage', () => {
      const res = http.post(`${API}/sales/deals/${dealId}/stage`, JSON.stringify({
        stage: 'qualification',
      }), { headers });

      writeLatency.add(res.timings.duration);
      const ok = check(res, { 'stage moved': (r) => r.status === 200 });
      if (!ok) errorRate.add(1);
      else errorRate.add(0);
    });

    sleep(0.3);

    group('6. Create Quote', () => {
      const res = http.post(`${API}/sales/deals/${dealId}/quotes`, JSON.stringify({
        name: `Quote-${__VU}-${__ITER}`,
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        lines: [
          { description: 'Widget A', quantity: 10, unitPrice: 99.99 },
          { description: 'Service B', quantity: 1, unitPrice: 500.00 },
        ],
      }), { headers });

      writeLatency.add(res.timings.duration);
      const ok = check(res, { 'quote created': (r) => r.status === 201 });
      if (!ok) errorRate.add(1);
      else {
        errorRate.add(0);
        quoteId = JSON.parse(res.body).id;
      }
    });

    sleep(0.5);

    if (quoteId) {
      group('7. Approve Quote', () => {
        const res = http.post(`${API}/sales/quotes/${quoteId}/approve`, null, { headers });
        writeLatency.add(res.timings.duration);
        const ok = check(res, { 'quote approved': (r) => r.status === 200 });
        if (!ok) errorRate.add(1);
        else errorRate.add(0);
      });
    }

    sleep(0.3);

    group('8. Mark Deal Won', () => {
      const res = http.post(`${API}/sales/deals/${dealId}/won`, null, { headers });
      writeLatency.add(res.timings.duration);
      const ok = check(res, { 'deal won': (r) => r.status === 200 });
      if (!ok) errorRate.add(1);
      else errorRate.add(0);
    });
  }

  sleep(1);
}

// ── Summary thresholds ──────────────────────────────────────────────────

export function handleSummary(data) {
  const summary = {
    read_p95: data.metrics.read_latency?.values?.['p(95)'] ?? 'N/A',
    write_p95: data.metrics.write_latency?.values?.['p(95)'] ?? 'N/A',
    error_rate: data.metrics.errors?.values?.rate ?? 'N/A',
    total_requests: data.metrics.http_reqs?.values?.count ?? 0,
  };

  console.log('\n=== Pipeline Flow Load Test Summary ===');
  console.log(`Read  p95: ${summary.read_p95}ms (target: <200ms)`);
  console.log(`Write p95: ${summary.write_p95}ms (target: <500ms)`);
  console.log(`Error rate: ${(summary.error_rate * 100).toFixed(2)}% (target: <1%)`);
  console.log(`Total requests: ${summary.total_requests}`);

  return {};
}
