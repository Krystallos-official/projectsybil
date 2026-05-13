import axios from 'axios';
import { BaseConnector, SyncOptions, SyncResult } from '../base';
import { getConfig } from '../../config';
import { ingestIssues } from './issues';
import { ingestIssueDependencies } from './dependencies';
import { computeAssigneeMetrics } from './assignees';

export class JiraConnector extends BaseConnector {
  readonly name = 'jira';
  readonly version = '1.0.0';

  private host!: string;
  private client!: ReturnType<typeof axios.create>;

  async connect(): Promise<void> {
    const config = getConfig();
    if (!config.JIRA_HOST || !config.JIRA_EMAIL || !config.JIRA_TOKEN) {
      throw new Error(
        'Jira connector requires JIRA_HOST, JIRA_EMAIL, and JIRA_TOKEN environment variables'
      );
    }

    this.host = config.JIRA_HOST;

    // Create Axios instance with basic auth
    const authString = Buffer.from(`${config.JIRA_EMAIL}:${config.JIRA_TOKEN}`).toString('base64');
    this.client = axios.create({
      baseURL: `https://${this.host}`,
      headers: {
        Authorization: `Basic ${authString}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.logger.info({ host: this.host }, 'Jira connector initialized');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/rest/api/3/myself');
      return true;
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : error },
        'Jira health check failed'
      );
      return false;
    }
  }

  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const allErrors: string[] = [];
    let totalNodes = 0;
    let totalRels = 0;

    this.logger.info('Starting Jira sync');

    // Step 1: Ingest issues (creates Employees, Projects, ASSIGNED_TO)
    const issueResult = await ingestIssues(this.client, this.host);
    totalNodes += issueResult.nodes;
    totalRels += issueResult.relationships;
    allErrors.push(...issueResult.errors);

    // Step 2: Ingest dependencies (creates BLOCKS, DEPENDS_ON)
    const depResult = await ingestIssueDependencies(this.client);
    totalNodes += depResult.nodes;
    totalRels += depResult.relationships;
    allErrors.push(...depResult.errors);

    // Step 3: Compute assignee metrics (avg_completion_days)
    const metricsResult = await computeAssigneeMetrics(this.client);
    allErrors.push(...metricsResult.errors);

    return this.createSyncResult({
      nodes_created: totalNodes,
      relationships_created: totalRels,
      duration_ms: Date.now() - startTime,
      errors: allErrors.map((msg) => ({
        entity: 'jira',
        message: msg,
        retryable: true,
      })),
    });
  }
}
