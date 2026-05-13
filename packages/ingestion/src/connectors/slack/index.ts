import { WebClient } from '@slack/web-api';
import { BaseConnector, SyncOptions, SyncResult } from '../base';
import { getConfig } from '../../config';
import { ingestChannelMembership } from './channels';
import { ingestMessageInteractions, getChannelIds } from './interactions';
import { resolveSlackToGithub } from './mentions';

export class SlackConnector extends BaseConnector {
  readonly name = 'slack';
  readonly version = '1.0.0';

  private client!: WebClient;

  async connect(): Promise<void> {
    const config = getConfig();
    if (!config.SLACK_BOT_TOKEN) {
      throw new Error('Slack connector requires SLACK_BOT_TOKEN environment variable');
    }

    this.client = new WebClient(config.SLACK_BOT_TOKEN);
    this.logger.info('Slack connector initialized');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.auth.test();
      this.logger.info({ team: result.team, user: result.user }, 'Slack health check passed');
      return true;
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : error },
        'Slack health check failed'
      );
      return false;
    }
  }

  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const since = options.since || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const startTime = Date.now();
    const allErrors: string[] = [];
    let totalNodes = 0;
    let totalRels = 0;

    this.logger.info({ since: since.toISOString() }, 'Starting Slack sync');

    // Step 1: Resolve Slack users to GitHub identities
    const identityResult = await resolveSlackToGithub(this.client);
    allErrors.push(...identityResult.errors);

    // Step 2: Ingest channel membership (co-presence signals)
    const membershipResult = await ingestChannelMembership(this.client);
    totalNodes += membershipResult.nodes;
    totalRels += membershipResult.relationships;
    allErrors.push(...membershipResult.errors);

    // Step 3: Ingest message interactions (@mentions and reactions)
    const channelIds = options.channels || await getChannelIds(this.client);
    const interactionResult = await ingestMessageInteractions(
      this.client,
      channelIds,
      since
    );
    totalNodes += interactionResult.nodes;
    totalRels += interactionResult.relationships;
    allErrors.push(...interactionResult.errors);

    return this.createSyncResult({
      nodes_created: totalNodes,
      relationships_created: totalRels,
      duration_ms: Date.now() - startTime,
      errors: allErrors.map((msg) => ({
        entity: 'slack',
        message: msg,
        retryable: true,
      })),
    });
  }
}
