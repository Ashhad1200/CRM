import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

const mockCreateArticle = vi.fn();
const mockUpdateArticle = vi.fn();
const mockFindArticles = vi.fn();
const mockFindArticlesBySearch = vi.fn();
const mockIncrementViewCount = vi.fn();
const mockIncrementHelpfulCount = vi.fn();
const mockCreateCategory = vi.fn();
const mockFindCategories = vi.fn();

vi.mock('../repository.js', () => ({
  createArticle: (...args: unknown[]) => mockCreateArticle(...args),
  updateArticle: (...args: unknown[]) => mockUpdateArticle(...args),
  findArticles: (...args: unknown[]) => mockFindArticles(...args),
  findArticlesBySearch: (...args: unknown[]) => mockFindArticlesBySearch(...args),
  incrementViewCount: (...args: unknown[]) => mockIncrementViewCount(...args),
  incrementHelpfulCount: (...args: unknown[]) => mockIncrementHelpfulCount(...args),
  createCategory: (...args: unknown[]) => mockCreateCategory(...args),
  findCategories: (...args: unknown[]) => mockFindCategories(...args),
}));

vi.mock('@softcrm/shared-kernel', async () => {
  const actual = await vi.importActual<typeof import('@softcrm/shared-kernel')>('@softcrm/shared-kernel');
  return {
    ...actual,
    generateId: vi.fn(() => 'generated-id'),
    slugify: vi.fn((title: string) => title.toLowerCase().replace(/\s+/g, '-')),
  };
});

// ── Import under test (after mocks) ────────────────────────────────────────────

import {
  createArticle,
  updateArticle,
  publishArticle,
  archiveArticle,
  getArticle,
  getArticles,
  searchArticles,
  suggestArticles,
  markArticleHelpful,
  createCategory,
  getCategories,
} from '../kb.service.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'actor-1';

const sampleArticle = {
  id: 'article-1',
  tenantId: TENANT_ID,
  title: 'How to Reset Password',
  slug: 'how-to-reset-password',
  body: 'Follow these steps...',
  status: 'DRAFT',
  categoryId: 'cat-1',
  authorId: ACTOR_ID,
  viewCount: 0,
  helpfulCount: 0,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createArticle ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createArticle', () => {
  const input = {
    title: 'How to Reset Password',
    body: 'Follow these steps...',
    categoryId: 'cat-1',
  };

  it('creates an article with generated slug', async () => {
    mockCreateArticle.mockResolvedValue(sampleArticle);

    const result = await createArticle(TENANT_ID, input, ACTOR_ID);

    expect(mockCreateArticle).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        id: 'generated-id',
        slug: 'how-to-reset-password',
        title: 'How to Reset Password',
      }),
    );
    expect(result).toEqual(sampleArticle);
  });

  it('sets authorId from actor', async () => {
    mockCreateArticle.mockResolvedValue(sampleArticle);

    await createArticle(TENANT_ID, input, ACTOR_ID);

    expect(mockCreateArticle).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        authorId: ACTOR_ID,
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── updateArticle ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('updateArticle', () => {
  it('re-generates slug when title changes', async () => {
    mockUpdateArticle.mockResolvedValue({ ...sampleArticle, title: 'New Title', slug: 'new-title' });

    await updateArticle(TENANT_ID, 'article-1', { title: 'New Title' });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      TENANT_ID,
      'article-1',
      expect.objectContaining({
        title: 'New Title',
        slug: 'new-title',
      }),
    );
  });

  it('does not regenerate slug when title is not provided', async () => {
    mockUpdateArticle.mockResolvedValue({ ...sampleArticle, body: 'Updated body' });

    await updateArticle(TENANT_ID, 'article-1', { body: 'Updated body' });

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      TENANT_ID,
      'article-1',
      expect.objectContaining({
        body: 'Updated body',
      }),
    );
    // slug should NOT be in the update payload
    const callArgs = mockUpdateArticle.mock.calls[0]![2] as Record<string, unknown>;
    expect(callArgs).not.toHaveProperty('slug');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── publishArticle ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('publishArticle', () => {
  it('sets status to PUBLISHED and publishedAt', async () => {
    mockUpdateArticle.mockResolvedValue({
      ...sampleArticle,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });

    const result = await publishArticle(TENANT_ID, 'article-1');

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      TENANT_ID,
      'article-1',
      expect.objectContaining({
        status: 'PUBLISHED',
        publishedAt: expect.any(Date),
      }),
    );
    expect(result.status).toBe('PUBLISHED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── archiveArticle ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('archiveArticle', () => {
  it('sets status to ARCHIVED', async () => {
    mockUpdateArticle.mockResolvedValue({ ...sampleArticle, status: 'ARCHIVED' });

    const result = await archiveArticle(TENANT_ID, 'article-1');

    expect(mockUpdateArticle).toHaveBeenCalledWith(
      TENANT_ID,
      'article-1',
      expect.objectContaining({ status: 'ARCHIVED' }),
    );
    expect(result.status).toBe('ARCHIVED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getArticle ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getArticle', () => {
  it('increments view count and returns article', async () => {
    mockIncrementViewCount.mockResolvedValue({ ...sampleArticle, viewCount: 1 });

    const result = await getArticle(TENANT_ID, 'article-1');

    expect(mockIncrementViewCount).toHaveBeenCalledWith(TENANT_ID, 'article-1');
    expect(result.viewCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── searchArticles ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('searchArticles', () => {
  it('returns paginated search results', async () => {
    mockFindArticlesBySearch.mockResolvedValue({
      data: [sampleArticle],
      total: 1,
      page: 1,
    });

    const result = await searchArticles(TENANT_ID, 'reset password', { page: 1, limit: 10 });

    expect(mockFindArticlesBySearch).toHaveBeenCalledWith(TENANT_ID, 'reset password', { page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.totalPages).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── suggestArticles ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('suggestArticles', () => {
  it('returns top 5 matching articles', async () => {
    const articles = Array.from({ length: 5 }, (_, i) => ({
      ...sampleArticle,
      id: `article-${i + 1}`,
    }));
    mockFindArticlesBySearch.mockResolvedValue({
      data: articles,
      total: 5,
      page: 1,
    });

    const result = await suggestArticles(TENANT_ID, 'password help');

    expect(mockFindArticlesBySearch).toHaveBeenCalledWith(TENANT_ID, 'password help', {
      page: 1,
      limit: 5,
    });
    expect(result).toHaveLength(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── markArticleHelpful ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('markArticleHelpful', () => {
  it('increments helpful count', async () => {
    mockIncrementHelpfulCount.mockResolvedValue({ ...sampleArticle, helpfulCount: 1 });

    const result = await markArticleHelpful(TENANT_ID, 'article-1');

    expect(mockIncrementHelpfulCount).toHaveBeenCalledWith(TENANT_ID, 'article-1');
    expect(result.helpfulCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createCategory ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createCategory', () => {
  it('delegates to repo.createCategory', async () => {
    const catData = { name: 'Getting Started', description: 'Intro articles' };
    const createdCat = { id: 'cat-1', tenantId: TENANT_ID, ...catData };
    mockCreateCategory.mockResolvedValue(createdCat);

    const result = await createCategory(TENANT_ID, catData);

    expect(mockCreateCategory).toHaveBeenCalledWith(TENANT_ID, catData);
    expect(result).toEqual(createdCat);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── getCategories ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('getCategories', () => {
  it('delegates to repo.findCategories', async () => {
    const categories = [
      { id: 'cat-1', tenantId: TENANT_ID, name: 'Getting Started' },
      { id: 'cat-2', tenantId: TENANT_ID, name: 'Troubleshooting' },
    ];
    mockFindCategories.mockResolvedValue(categories);

    const result = await getCategories(TENANT_ID);

    expect(mockFindCategories).toHaveBeenCalledWith(TENANT_ID);
    expect(result).toHaveLength(2);
  });
});
