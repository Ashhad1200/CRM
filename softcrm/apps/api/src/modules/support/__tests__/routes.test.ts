import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mock service layer ─────────────────────────────────────────────────────────

const mockCreateTicket = vi.fn();
const mockAddReply = vi.fn();
const mockResolveTicket = vi.fn();
const mockCloseTicket = vi.fn();
const mockEscalateTicket = vi.fn();
const mockReopenTicket = vi.fn();
const mockGetTicket = vi.fn();
const mockGetTickets = vi.fn();
const mockGetTicketReplies = vi.fn();

vi.mock('../service.js', () => ({
  createTicket: (...args: unknown[]) => mockCreateTicket(...args),
  addReply: (...args: unknown[]) => mockAddReply(...args),
  resolveTicket: (...args: unknown[]) => mockResolveTicket(...args),
  closeTicket: (...args: unknown[]) => mockCloseTicket(...args),
  escalateTicket: (...args: unknown[]) => mockEscalateTicket(...args),
  reopenTicket: (...args: unknown[]) => mockReopenTicket(...args),
  getTicket: (...args: unknown[]) => mockGetTicket(...args),
  getTickets: (...args: unknown[]) => mockGetTickets(...args),
  getTicketReplies: (...args: unknown[]) => mockGetTicketReplies(...args),
}));

const mockCreateArticle = vi.fn();
const mockUpdateArticle = vi.fn();
const mockPublishArticle = vi.fn();
const mockArchiveArticle = vi.fn();
const mockGetArticle = vi.fn();
const mockGetArticles = vi.fn();
const mockSearchArticles = vi.fn();
const mockSuggestArticles = vi.fn();
const mockMarkArticleHelpful = vi.fn();
const mockCreateCategory = vi.fn();
const mockGetCategories = vi.fn();

vi.mock('../kb.service.js', () => ({
  createArticle: (...args: unknown[]) => mockCreateArticle(...args),
  updateArticle: (...args: unknown[]) => mockUpdateArticle(...args),
  publishArticle: (...args: unknown[]) => mockPublishArticle(...args),
  archiveArticle: (...args: unknown[]) => mockArchiveArticle(...args),
  getArticle: (...args: unknown[]) => mockGetArticle(...args),
  getArticles: (...args: unknown[]) => mockGetArticles(...args),
  searchArticles: (...args: unknown[]) => mockSearchArticles(...args),
  suggestArticles: (...args: unknown[]) => mockSuggestArticles(...args),
  markArticleHelpful: (...args: unknown[]) => mockMarkArticleHelpful(...args),
  createCategory: (...args: unknown[]) => mockCreateCategory(...args),
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
}));

const mockFindCsatByTicket = vi.fn();
const mockSubmitCsatRating = vi.fn();
const mockGetCsatStats = vi.fn();

vi.mock('../repository.js', () => ({
  findCsatByTicket: (...args: unknown[]) => mockFindCsatByTicket(...args),
  submitCsatRating: (...args: unknown[]) => mockSubmitCsatRating(...args),
  getCsatStats: (...args: unknown[]) => mockGetCsatStats(...args),
}));

vi.mock('../../../middleware/validate.js', () => ({
  validate: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('../../../middleware/rbac.js', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
  tenantContext: { getStore: vi.fn() },
}));

// ── Import router (after mocks) ────────────────────────────────────────────────

import { supportRouter } from '../routes.js';

// ── Test app setup ─────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'actor-1';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { tid: TENANT_ID, sub: ACTOR_ID };
    next();
  });
  app.use('/support', supportRouter);
  return app;
}

const app = createApp();

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Ticket routes ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /support/tickets', () => {
  it('returns 200 with paginated tickets', async () => {
    mockGetTickets.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    const res = await request(app)
      .get('/support/tickets')
      .query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(mockGetTickets).toHaveBeenCalled();
  });
});

describe('POST /support/tickets', () => {
  it('returns 201 with created ticket', async () => {
    const ticket = { id: 'ticket-1', subject: 'Help' };
    mockCreateTicket.mockResolvedValue(ticket);

    const res = await request(app)
      .post('/support/tickets')
      .send({ subject: 'Help', description: 'Need help', contactId: 'c-1' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: ticket });
    expect(mockCreateTicket).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ subject: 'Help' }),
      ACTOR_ID,
    );
  });
});

describe('GET /support/tickets/:id', () => {
  it('returns 200 with ticket detail', async () => {
    const ticket = { id: 'ticket-1', subject: 'Help', replies: [] };
    mockGetTicket.mockResolvedValue(ticket);

    const res = await request(app).get('/support/tickets/ticket-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: ticket });
    expect(mockGetTicket).toHaveBeenCalledWith(TENANT_ID, 'ticket-1');
  });
});

describe('POST /support/tickets/:id/reply', () => {
  it('returns 201 with created reply', async () => {
    const reply = { id: 'reply-1', body: 'Fixed it' };
    mockAddReply.mockResolvedValue(reply);

    const res = await request(app)
      .post('/support/tickets/ticket-1/reply')
      .send({ body: 'Fixed it', authorType: 'AGENT' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: reply });
    expect(mockAddReply).toHaveBeenCalledWith(
      TENANT_ID,
      'ticket-1',
      expect.objectContaining({ body: 'Fixed it' }),
      ACTOR_ID,
    );
  });
});

describe('POST /support/tickets/:id/resolve', () => {
  it('returns 200 with resolved ticket', async () => {
    const ticket = { id: 'ticket-1', status: 'RESOLVED' };
    mockResolveTicket.mockResolvedValue(ticket);

    const res = await request(app)
      .post('/support/tickets/ticket-1/resolve')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: ticket });
    expect(mockResolveTicket).toHaveBeenCalledWith(TENANT_ID, 'ticket-1', ACTOR_ID);
  });
});

describe('POST /support/tickets/:id/close', () => {
  it('returns 200 with closed ticket', async () => {
    const ticket = { id: 'ticket-1', status: 'CLOSED' };
    mockCloseTicket.mockResolvedValue(ticket);

    const res = await request(app).post('/support/tickets/ticket-1/close');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: ticket });
    expect(mockCloseTicket).toHaveBeenCalledWith(TENANT_ID, 'ticket-1', ACTOR_ID);
  });
});

describe('POST /support/tickets/:id/escalate', () => {
  it('returns 200 with escalated ticket', async () => {
    const ticket = { id: 'ticket-1', priority: 'URGENT' };
    mockEscalateTicket.mockResolvedValue(ticket);

    const res = await request(app)
      .post('/support/tickets/ticket-1/escalate')
      .send({ reason: 'SLA breach' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: ticket });
    expect(mockEscalateTicket).toHaveBeenCalledWith(
      TENANT_ID,
      'ticket-1',
      ACTOR_ID,
      'SLA breach',
    );
  });
});

describe('POST /support/tickets/:id/reopen', () => {
  it('returns 200 with reopened ticket', async () => {
    const ticket = { id: 'ticket-1', status: 'OPEN' };
    mockReopenTicket.mockResolvedValue(ticket);

    const res = await request(app).post('/support/tickets/ticket-1/reopen');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: ticket });
    expect(mockReopenTicket).toHaveBeenCalledWith(TENANT_ID, 'ticket-1', ACTOR_ID);
  });
});

describe('GET /support/tickets/:id/replies', () => {
  it('returns 200 with replies', async () => {
    const replies = [{ id: 'reply-1', body: 'Hi' }];
    mockGetTicketReplies.mockResolvedValue(replies);

    const res = await request(app).get('/support/tickets/ticket-1/replies');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: replies });
    expect(mockGetTicketReplies).toHaveBeenCalledWith(TENANT_ID, 'ticket-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── KB Article routes ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /support/kb/articles', () => {
  it('returns 200 with paginated articles', async () => {
    mockGetArticles.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    const res = await request(app)
      .get('/support/kb/articles')
      .query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(mockGetArticles).toHaveBeenCalled();
  });
});

describe('POST /support/kb/articles', () => {
  it('returns 201 with created article', async () => {
    const article = { id: 'article-1', title: 'How to Reset' };
    mockCreateArticle.mockResolvedValue(article);

    const res = await request(app)
      .post('/support/kb/articles')
      .send({ title: 'How to Reset', body: 'Steps...', categoryId: 'cat-1' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: article });
    expect(mockCreateArticle).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ title: 'How to Reset' }),
      ACTOR_ID,
    );
  });
});

describe('POST /support/kb/articles/:id/publish', () => {
  it('returns 200 with published article', async () => {
    const article = { id: 'article-1', status: 'PUBLISHED' };
    mockPublishArticle.mockResolvedValue(article);

    const res = await request(app).post('/support/kb/articles/article-1/publish');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: article });
    expect(mockPublishArticle).toHaveBeenCalledWith(TENANT_ID, 'article-1');
  });
});

describe('POST /support/kb/articles/:id/helpful', () => {
  it('returns 200 after marking helpful', async () => {
    const article = { id: 'article-1', helpfulCount: 1 };
    mockMarkArticleHelpful.mockResolvedValue(article);

    const res = await request(app).post('/support/kb/articles/article-1/helpful');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: article });
    expect(mockMarkArticleHelpful).toHaveBeenCalledWith(TENANT_ID, 'article-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── KB Category routes ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /support/kb/categories', () => {
  it('returns 200 with categories', async () => {
    const categories = [{ id: 'cat-1', name: 'Getting Started' }];
    mockGetCategories.mockResolvedValue(categories);

    const res = await request(app).get('/support/kb/categories');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: categories });
    expect(mockGetCategories).toHaveBeenCalledWith(TENANT_ID);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── CSAT routes ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /support/csat/:id/submit', () => {
  it('returns 200 with submitted CSAT', async () => {
    const survey = { id: 'csat-1', rating: 5, comment: 'Great!' };
    mockSubmitCsatRating.mockResolvedValue(survey);

    const res = await request(app)
      .post('/support/csat/csat-1/submit')
      .send({ rating: 5, comment: 'Great!' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: survey });
    expect(mockSubmitCsatRating).toHaveBeenCalledWith('csat-1', 5, 'Great!');
  });
});
