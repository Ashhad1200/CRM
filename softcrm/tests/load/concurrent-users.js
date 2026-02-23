/**
 * T220 — k6 load test: Concurrent Users Across All Modules
 *
 * 500 concurrent users hitting all module endpoints simultaneously.
 *
 * Run: k6 run tests/load/concurrent-users.js
 *
 * Targets:
 *   throughput: sustained 500 concurrent users
 *   error rate: < 0.1%
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom metrics ──────────────────────────────────────────────────────

const errorRate = new Rate('errors');
const moduleLatency = new Trend('module_latency', true);
const requestCount = new Counter('total_requests');

// ── Configuration ───────────────────────────────────────────────────────

export const options = {
  scenarios: {
    concurrent_users: {
      executor: 'constant-vus',
      vus: 500,
      duration: '5m',
    },
  },
  thresholds: {
    errors: ['rate<0.001'],           // error rate < 0.1%
    http_req_failed: ['rate<0.001'],
    http_req_duration: ['p(95)<1000'], // overall p95 < 1s
    module_latency: ['p(95)<500'],
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
  return __ENV.AUTH_TOKEN || '';
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// ── Module endpoint definitions ─────────────────────────────────────────

const MODULE_ENDPOINTS = [
  // Sales
  { name: 'sales.contacts', method: 'GET', path: '/sales/contacts?page=1&limit=10' },
  { name: 'sales.accounts', method: 'GET', path: '/sales/accounts?page=1&limit=10' },
  { name: 'sales.leads', method: 'GET', path: '/sales/leads?page=1&limit=10' },
  { name: 'sales.deals', method: 'GET', path: '/sales/deals?page=1&limit=10' },
  { name: 'sales.pipelines', method: 'GET', path: '/sales/pipelines' },

  // Accounting
  { name: 'accounting.invoices', method: 'GET', path: '/accounting/invoices?page=1&limit=10' },
  { name: 'accounting.expenses', method: 'GET', path: '/accounting/expenses?page=1&limit=10' },
  { name: 'accounting.chart', method: 'GET', path: '/accounting/chart-of-accounts' },
  { name: 'accounting.journalEntries', method: 'GET', path: '/accounting/journal-entries?page=1&limit=10' },

  // Support
  { name: 'support.tickets', method: 'GET', path: '/support/tickets?page=1&limit=10' },
  { name: 'support.articles', method: 'GET', path: '/support/kb/articles?page=1&limit=10' },
  { name: 'support.categories', method: 'GET', path: '/support/kb/categories' },

  // Inventory
  { name: 'inventory.products', method: 'GET', path: '/inventory/products?page=1&limit=10' },
  { name: 'inventory.warehouses', method: 'GET', path: '/inventory/warehouses' },
  { name: 'inventory.orders', method: 'GET', path: '/inventory/orders?page=1&limit=10' },

  // Marketing
  { name: 'marketing.campaigns', method: 'GET', path: '/marketing/campaigns?page=1&limit=10' },
  { name: 'marketing.segments', method: 'GET', path: '/marketing/segments?page=1&limit=10' },

  // Analytics
  { name: 'analytics.dashboards', method: 'GET', path: '/analytics/dashboards?page=1&limit=10' },
  { name: 'analytics.reports', method: 'GET', path: '/analytics/reports?page=1&limit=10' },
  { name: 'analytics.pipelineMetrics', method: 'GET', path: '/analytics/pipeline-metrics' },

  // Projects
  { name: 'projects.list', method: 'GET', path: '/projects?page=1&limit=10' },

  // Comms
  { name: 'comms.activities', method: 'GET', path: '/comms/activities?page=1&limit=10' },
  { name: 'comms.templates', method: 'GET', path: '/comms/email-templates?page=1&limit=10' },
];

// ── Main scenario ───────────────────────────────────────────────────────

export default function () {
  const token = login();
  const headers = authHeaders(token);

  // Each VU hits a random subset of endpoints to simulate real user behavior
  const shuffled = MODULE_ENDPOINTS.slice().sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 5); // Each VU hits 5 random endpoints per iteration

  for (const endpoint of selected) {
    group(endpoint.name, () => {
      const url = `${API}${endpoint.path}`;
      const res = endpoint.method === 'GET'
        ? http.get(url, { headers })
        : http.post(url, null, { headers });

      moduleLatency.add(res.timings.duration);
      requestCount.add(1);

      const ok = check(res, {
        [`${endpoint.name} OK`]: (r) => r.status >= 200 && r.status < 400,
      });

      if (!ok) errorRate.add(1);
      else errorRate.add(0);
    });

    sleep(0.2 + Math.random() * 0.3); // 200-500ms think time
  }

  sleep(1);
}

// ── Summary ─────────────────────────────────────────────────────────────

export function handleSummary(data) {
  const summary = {
    p50: data.metrics.module_latency?.values?.['p(50)'] ?? 'N/A',
    p95: data.metrics.module_latency?.values?.['p(95)'] ?? 'N/A',
    p99: data.metrics.module_latency?.values?.['p(99)'] ?? 'N/A',
    error_rate: data.metrics.errors?.values?.rate ?? 0,
    total_requests: data.metrics.total_requests?.values?.count ?? 0,
  };

  console.log('\n=== Concurrent Users Load Test Summary ===');
  console.log(`Module latency p50: ${summary.p50}ms`);
  console.log(`Module latency p95: ${summary.p95}ms (target: <500ms)`);
  console.log(`Module latency p99: ${summary.p99}ms`);
  console.log(`Error rate: ${(summary.error_rate * 100).toFixed(3)}% (target: <0.1%)`);
  console.log(`Total requests: ${summary.total_requests}`);

  return {};
}
