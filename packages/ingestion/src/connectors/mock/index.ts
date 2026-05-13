import { BaseConnector, SyncOptions, SyncResult } from '../base';
import { generateMockData } from './generator';
import { getScenario } from './scenarios';

export class MockConnector extends BaseConnector {
  readonly name = 'mock';
  readonly version = '1.0.0';

  private scenarioName = 'enterprise_1000';

  setScenario(name: string): void { this.scenarioName = name; }

  async connect(): Promise<void> { this.logger.info('Mock connector ready'); }

  async healthCheck(): Promise<boolean> { return true; }

  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const scenario = getScenario(this.scenarioName);
    this.logger.info({ scenario: this.scenarioName }, 'Generating mock data');

    const result = await generateMockData({
      totalEmployees: scenario.totalEmployees,
      departments: scenario.departments,
      repoCount: scenario.repoCount,
      projectCount: scenario.projectCount,
      tools: scenario.tools,
    });

    return this.createSyncResult({
      nodes_created: result.employees + result.projects + result.repos,
      relationships_created: result.relationships,
      duration_ms: Date.now() - startTime,
      errors: [],
    });
  }
}
