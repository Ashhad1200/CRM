/**
 * Support module — Knowledge Base service (business-logic layer).
 *
 * Handles KB article CRUD, publishing, search, and category management.
 * Every public function is explicitly scoped by `tenantId`.
 */

import {
  generateId,
  slugify,
} from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import * as repo from './repository.js';

import type {
  ArticleFilters,
  PaginationInput,
} from './types.js';
import type {
  CreateArticleInput,
  UpdateArticleInput,
  CreateCategoryInput,
} from './validators.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Articles ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new KB article.
 *
 * - Generates a URL-safe slug from the title.
 * - Sets authorId from the actor.
 */
export async function createArticle(
  tenantId: string,
  data: CreateArticleInput,
  actorId: string,
) {
  const id = generateId();
  const slug = slugify(data.title);

  return repo.createArticle(tenantId, {
    ...data,
    id,
    slug,
    authorId: actorId,
  });
}

/** Update an existing KB article. */
export async function updateArticle(
  tenantId: string,
  id: string,
  data: UpdateArticleInput,
) {
  const updateData: Record<string, unknown> = { ...data };

  // Re-generate slug if title changed
  if (data.title) {
    updateData['slug'] = slugify(data.title);
  }

  return repo.updateArticle(tenantId, id, updateData);
}

/**
 * Publish an article.
 *
 * - Sets status = PUBLISHED, publishedAt = now.
 */
export async function publishArticle(
  tenantId: string,
  id: string,
) {
  return repo.updateArticle(tenantId, id, {
    status: 'PUBLISHED',
    publishedAt: new Date(),
  });
}

/**
 * Archive an article.
 *
 * - Sets status = ARCHIVED.
 */
export async function archiveArticle(
  tenantId: string,
  id: string,
) {
  return repo.updateArticle(tenantId, id, {
    status: 'ARCHIVED',
  });
}

/**
 * Get a single article (increments view count).
 */
export async function getArticle(tenantId: string, id: string) {
  // Increment view count and return updated article
  return repo.incrementViewCount(tenantId, id);
}

/**
 * Get articles with filters and pagination.
 */
export async function getArticles(
  tenantId: string,
  filters: ArticleFilters,
  pagination: PaginationInput,
): Promise<PaginatedResult<unknown>> {
  const { data, total, page } = await repo.findArticles(tenantId, filters, pagination);
  return {
    data,
    total,
    page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

/**
 * Search published articles by text query.
 */
export async function searchArticles(
  tenantId: string,
  query: string,
  pagination: PaginationInput,
): Promise<PaginatedResult<unknown>> {
  const { data, total, page } = await repo.findArticlesBySearch(tenantId, query, pagination);
  return {
    data,
    total,
    page,
    pageSize: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

/**
 * Suggest articles relevant to a ticket description.
 *
 * Performs a text search using the provided query (typically ticket subject/description).
 */
export async function suggestArticles(
  tenantId: string,
  query: string,
) {
  const { data } = await repo.findArticlesBySearch(tenantId, query, {
    page: 1,
    limit: 5,
  });
  return data;
}

/**
 * Mark an article as helpful (increment helpfulCount).
 */
export async function markArticleHelpful(
  tenantId: string,
  id: string,
) {
  return repo.incrementHelpfulCount(tenantId, id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Categories ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Create a new KB category. */
export async function createCategory(
  tenantId: string,
  data: CreateCategoryInput,
) {
  return repo.createCategory(tenantId, data);
}

/** Get all KB categories for a tenant. */
export async function getCategories(tenantId: string) {
  return repo.findCategories(tenantId);
}
