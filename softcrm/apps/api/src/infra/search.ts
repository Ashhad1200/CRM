import { MeiliSearch, type Index } from 'meilisearch';
import { getConfig } from '../config/index.js';
import { logger } from '../logger.js';

let client: MeiliSearch | null = null;

function getClient(): MeiliSearch {
  if (!client) {
    const config = getConfig();
    client = new MeiliSearch({
      host: config.MEILI_HOST,
      apiKey: config.MEILI_MASTER_KEY,
    });
  }
  return client;
}

/**
 * Ensure a Meilisearch index exists with the given settings.
 */
export async function ensureIndex(
  indexName: string,
  options?: {
    searchableAttributes?: string[];
    filterableAttributes?: string[];
    sortableAttributes?: string[];
  },
): Promise<Index> {
  const meili = getClient();
  try {
    await meili.createIndex(indexName, { primaryKey: 'id' });
  } catch {
    // Index may already exist — that's fine
  }

  const index = meili.index(indexName);

  if (options?.searchableAttributes) {
    await index.updateSearchableAttributes(options.searchableAttributes);
  }
  if (options?.filterableAttributes) {
    await index.updateFilterableAttributes(options.filterableAttributes);
  }
  if (options?.sortableAttributes) {
    await index.updateSortableAttributes(options.sortableAttributes);
  }

  logger.info({ indexName }, 'Meilisearch index ensured');
  return index;
}

/**
 * Index (upsert) documents into a Meilisearch index.
 */
export async function indexDocuments<T extends Record<string, unknown>>(
  indexName: string,
  documents: T[],
): Promise<void> {
  const meili = getClient();
  const index = meili.index(indexName);
  await index.addDocuments(documents);
  logger.debug({ indexName, count: documents.length }, 'Documents indexed');
}

/**
 * Remove documents from a Meilisearch index.
 */
export async function removeDocuments(
  indexName: string,
  ids: string[],
): Promise<void> {
  const meili = getClient();
  const index = meili.index(indexName);
  await index.deleteDocuments(ids);
  logger.debug({ indexName, count: ids.length }, 'Documents removed');
}

/**
 * Search a Meilisearch index.
 */
export async function search<T extends Record<string, unknown>>(
  indexName: string,
  query: string,
  options?: { filter?: string; sort?: string[]; limit?: number; offset?: number },
): Promise<{ hits: T[]; estimatedTotalHits: number }> {
  const meili = getClient();
  const index = meili.index(indexName);

  const result = await index.search<T>(query, {
    filter: options?.filter,
    sort: options?.sort,
    limit: options?.limit ?? 20,
    offset: options?.offset ?? 0,
  });

  return {
    hits: result.hits,
    estimatedTotalHits: result.estimatedTotalHits ?? 0,
  };
}
