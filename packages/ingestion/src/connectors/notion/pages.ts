import { Client } from '@notionhq/client';
import { upsertEmployee } from '../../neo4j/queries/employees';
import { mergeWeight } from '../../neo4j/queries/relationships';
import pino from 'pino';

const logger = pino({ name: 'notion:pages' });

/**
 * Ingest page activity from Notion.
 * Creates collaboration signals from page editing patterns.
 * Surfaces documentation SPOFs — people who exclusively own knowledge pages.
 */
export async function ingestPageActivity(
  client: Client
): Promise<{ nodes: number; relationships: number; errors: string[] }> {
  let nodesCreated = 0;
  let relsCreated = 0;
  const errors: string[] = [];

  // Track page editors: pageId → Set<userId>
  const pageEditors = new Map<string, Set<string>>();

  try {
    // Search all pages the integration has access to
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    while (hasMore) {
      const searchResult = await client.search({
        filter: { property: 'object', value: 'page' },
        page_size: 100,
        start_cursor: startCursor,
      });

      for (const page of searchResult.results) {
        if (page.object !== 'page') continue;

        const pageData = page as {
          id: string;
          last_edited_by: { id: string };
          last_edited_time: string;
          url: string;
        };

        const pageId = pageData.id;
        const lastEditor = pageData.last_edited_by?.id;

        if (lastEditor) {
          if (!pageEditors.has(pageId)) {
            pageEditors.set(pageId, new Set());
          }
          pageEditors.get(pageId)!.add(lastEditor);
        }

        // Get block children to find @mentions and additional editors
        try {
          let blockCursor: string | undefined = undefined;
          let hasMoreBlocks = true;

          while (hasMoreBlocks) {
            const blocksResult = await client.blocks.children.list({
              block_id: pageId,
              page_size: 100,
              start_cursor: blockCursor,
            });

            for (const block of blocksResult.results) {
              const blockData = block as {
                created_by?: { id: string };
                last_edited_by?: { id: string };
              };

              // Track all editors
              if (blockData.created_by?.id) {
                if (!pageEditors.has(pageId)) {
                  pageEditors.set(pageId, new Set());
                }
                pageEditors.get(pageId)!.add(blockData.created_by.id);
              }
              if (blockData.last_edited_by?.id) {
                pageEditors.get(pageId)!.add(blockData.last_edited_by.id);
              }
            }

            hasMoreBlocks = blocksResult.has_more;
            blockCursor = blocksResult.next_cursor || undefined;
          }
        } catch (blockError) {
          // Some pages may not allow block listing — skip silently
          logger.debug({ pageId }, 'Could not list blocks');
        }
      }

      hasMore = searchResult.has_more;
      startCursor = searchResult.next_cursor || undefined;
    }

    // Create COLLABORATES_WITH relationships between co-editors of the same page
    for (const [pageId, editors] of pageEditors) {
      const editorArray = Array.from(editors);

      for (let i = 0; i < editorArray.length; i++) {
        for (let j = i + 1; j < editorArray.length; j++) {
          await mergeWeight(editorArray[i], editorArray[j], 'COLLABORATES_WITH', 1, {
            channels: ['notion'],
          });
          relsCreated++;
        }
      }
    }

    logger.info({
      pages: pageEditors.size,
      relsCreated,
    }, 'Notion page activity ingestion complete');
  } catch (error) {
    const msg = `Notion page ingestion failed: ${error instanceof Error ? error.message : error}`;
    logger.error(msg);
    errors.push(msg);
  }

  return { nodes: nodesCreated, relationships: relsCreated, errors };
}
