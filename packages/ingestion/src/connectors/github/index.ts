import { Octokit } from '@octokit/rest';
import { BaseConnector, SyncOptions, SyncResult } from '../base';
import { getConfig } from '../../config';
import { ingestCommits } from './commits';
import { ingestPullRequests } from './pullRequests';
import { ingestCodeOwnership } from './reviews';

export class GitHubConnector extends BaseConnector {
  readonly name = 'github';
  readonly version = '1.0.0';

  private octokit!: Octokit;
  private org!: string;

  async connect(): Promise<void> {
    const config = getConfig();
    if (!config.GITHUB_TOKEN || !config.GITHUB_ORG) {
      throw new Error('GitHub connector requires GITHUB_TOKEN and GITHUB_ORG environment variables');
    }

    this.octokit = new Octokit({
      auth: config.GITHUB_TOKEN,
      throttle: {
        onRateLimit: (retryAfter: number, options: Record<string, unknown>) => {
          this.logger.warn(
            { retryAfter, method: options.method, url: options.url },
            'GitHub rate limit hit, retrying'
          );
          return true; // Retry
        },
        onSecondaryRateLimit: (retryAfter: number, options: Record<string, unknown>) => {
          this.logger.warn(
            { retryAfter, method: options.method, url: options.url },
            'GitHub secondary rate limit hit'
          );
          return false; // Don't retry
        },
      },
    });

    this.org = config.GITHUB_ORG;
    this.logger.info({ org: this.org }, 'GitHub connector initialized');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.octokit.orgs.get({ org: this.org });
      return true;
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : error },
        'GitHub health check failed'
      );
      return false;
    }
  }

  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const since = options.since || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default: 90 days
    const startTime = Date.now();
    const errors: string[] = [];
    let totalNodes = 0;
    let totalRels = 0;

    this.logger.info(
      { since: since.toISOString(), repos: options.repos },
      'Starting GitHub sync'
    );

    // Ingest commits (creates Employee, Repository, COMMITS_TO, OWNS)
    const commitResult = await ingestCommits(this.octokit, this.org, since, options.repos);
    totalNodes += commitResult.nodes;
    totalRels += commitResult.relationships;
    errors.push(...commitResult.errors);

    // Ingest pull requests and reviews (creates REVIEWS relationships)
    const prResult = await ingestPullRequests(this.octokit, this.org, since, options.repos);
    totalNodes += prResult.nodes;
    totalRels += prResult.relationships;
    errors.push(...prResult.errors);

    // Ingest CODEOWNERS (creates explicit OWNS relationships)
    const ownershipResult = await ingestCodeOwnership(this.octokit, this.org, options.repos);
    totalNodes += ownershipResult.nodes;
    totalRels += ownershipResult.relationships;
    errors.push(...ownershipResult.errors);

    return this.createSyncResult({
      nodes_created: totalNodes,
      relationships_created: totalRels,
      duration_ms: Date.now() - startTime,
      errors: errors.map((msg) => ({
        entity: 'github',
        message: msg,
        retryable: true,
      })),
    });
  }
}
