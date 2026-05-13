import { Client } from '@notionhq/client';
import { BaseConnector, SyncOptions, SyncResult } from '../base';
import { getConfig } from '../../config';
import { ingestPageActivity } from './pages';
import { resolveNotionUsers } from './contributors';

export class NotionConnector extends BaseConnector {
  readonly name = 'notion';
  readonly version = '1.0.0';

  private client!: Client;

  async connect(): Promise<void> {
    const config = getConfig();
    if (!config.NOTION_TOKEN) {
      throw new Error('Notion connector requires NOTION_TOKEN environment variable');
    }

    this.client = new Client({ auth: config.NOTION_TOKEN });
    this.logger.info('Notion connector initialized');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.users.me({});
      return true;
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : error },
        'Notion health check failed'
      );
      return false;
    }
  }

  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const allErrors: string[] = [];
    let totalNodes = 0;
    let totalRels = 0;

    this.logger.info('Starting Notion sync');

    // Step 1: Resolve Notion users to Employee nodes
    const identityResult = await resolveNotionUsers(this.client);
    allErrors.push(...identityResult.errors);

    // Step 2: Ingest page activity (co-editing collaboration signals)
    const pageResult = await ingestPageActivity(this.client);
    totalNodes += pageResult.nodes;
    totalRels += pageResult.relationships;
    allErrors.push(...pageResult.errors);

    return this.createSyncResult({
      nodes_created: totalNodes,
      relationships_created: totalRels,
      duration_ms: Date.now() - startTime,
      errors: allErrors.map((msg) => ({
        entity: 'notion',
        message: msg,
        retryable: true,
      })),
    });
  }
}
