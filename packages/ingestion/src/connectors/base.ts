import pino from 'pino';
import { upsertEmployee, EmployeeInput } from '../neo4j/queries/employees';
import { mergeWeight, setOwnership } from '../neo4j/queries/relationships';

export interface SyncOptions {
  since?: Date;
  repos?: string[];
  channels?: string[];
  dryRun?: boolean;
}

export interface SyncResult {
  connector: string;
  nodes_created: number;
  relationships_created: number;
  duration_ms: number;
  errors: SyncError[];
  started_at: string;
  completed_at: string;
}

export interface SyncError {
  entity: string;
  message: string;
  code?: string;
  retryable: boolean;
}

export abstract class BaseConnector {
  abstract readonly name: string;
  abstract readonly version: string;

  protected logger: pino.Logger;
  private syncCount = 0;
  private failureCount = 0;

  constructor() {
    this.logger = pino({ name: `connector:${this.constructor.name}` });
  }

  /**
   * Initialize connection to the external service.
   */
  abstract connect(): Promise<void>;

  /**
   * Verify the service is reachable and credentials are valid.
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Run a full or incremental sync from the external service.
   */
  abstract sync(options?: SyncOptions): Promise<SyncResult>;

  /**
   * Upsert an employee node with identity fields.
   */
  protected async upsertEmployee(employee: EmployeeInput): Promise<void> {
    await upsertEmployee(employee);
  }

  /**
   * Merge a weighted relationship, accumulating weight safely.
   * Uses MERGE + SET weight = COALESCE(weight, 0) + increment
   */
  protected async mergeWeight(
    fromId: string,
    toId: string,
    relType: string,
    increment: number,
    extraProps?: Record<string, unknown>
  ): Promise<void> {
    await mergeWeight(fromId, toId, relType, increment, extraProps);
  }

  /**
   * Set ownership relationship between employee and target.
   */
  protected async setOwnership(
    employeeId: string,
    targetId: string,
    targetType: 'Project' | 'Repository',
    ownershipScore: number,
    source = 'inferred'
  ): Promise<void> {
    await setOwnership(employeeId, targetId, targetType, ownershipScore, source);
  }

  /**
   * Create a standard SyncResult with timing and error tracking.
   */
  protected createSyncResult(partial: Partial<SyncResult>): SyncResult {
    return {
      connector: this.name,
      nodes_created: partial.nodes_created || 0,
      relationships_created: partial.relationships_created || 0,
      duration_ms: partial.duration_ms || 0,
      errors: partial.errors || [],
      started_at: partial.started_at || new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
  }

  /**
   * Wrap sync execution with logging, timing, and failure tracking.
   */
  async executeSyncWithTracking(options?: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    this.logger.info({ syncCount: ++this.syncCount, options }, `Starting sync`);

    try {
      const result = await this.sync(options);
      result.started_at = startedAt;
      result.duration_ms = Date.now() - startTime;

      this.failureCount = 0; // Reset on success

      this.logger.info(
        {
          nodes_created: result.nodes_created,
          relationships_created: result.relationships_created,
          duration_ms: result.duration_ms,
          errors: result.errors.length,
        },
        `Sync completed`
      );

      return result;
    } catch (error) {
      this.failureCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        { error: errorMessage, failureCount: this.failureCount },
        `Sync failed`
      );

      if (this.failureCount > 3) {
        this.logger.error(
          `[ALERT] ${this.name} connector has failed ${this.failureCount} consecutive times. Requires manual intervention.`
        );
      }

      return this.createSyncResult({
        started_at: startedAt,
        duration_ms: Date.now() - startTime,
        errors: [
          {
            entity: this.name,
            message: errorMessage,
            retryable: this.failureCount <= 3,
          },
        ],
      });
    }
  }

  /**
   * Get the current failure count for monitoring.
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Get the total sync count for metrics.
   */
  getSyncCount(): number {
    return this.syncCount;
  }
}
