import { SaaSToolInput } from '../../neo4j/queries/projects';

const STANDARD_TOOLS: SaaSToolInput[] = [
  { id: 'github', name: 'GitHub', category: 'dev', monthly_cost_usd: 2100, vendor_url: 'https://github.com' },
  { id: 'slack', name: 'Slack', category: 'comms', monthly_cost_usd: 1250, vendor_url: 'https://slack.com' },
  { id: 'jira', name: 'Jira', category: 'productivity', monthly_cost_usd: 800, vendor_url: 'https://atlassian.com' },
  { id: 'notion', name: 'Notion', category: 'productivity', monthly_cost_usd: 960, vendor_url: 'https://notion.so' },
  { id: 'figma', name: 'Figma', category: 'design', monthly_cost_usd: 720, vendor_url: 'https://figma.com' },
  { id: 'aws', name: 'AWS', category: 'dev', monthly_cost_usd: 45000, vendor_url: 'https://aws.amazon.com' },
  { id: 'datadog', name: 'Datadog', category: 'dev', monthly_cost_usd: 3200, vendor_url: 'https://datadoghq.com' },
  { id: 'snowflake', name: 'Snowflake', category: 'data', monthly_cost_usd: 8500, vendor_url: 'https://snowflake.com' },
  { id: 'salesforce', name: 'Salesforce', category: 'productivity', monthly_cost_usd: 3600, vendor_url: 'https://salesforce.com' },
  { id: 'hubspot', name: 'HubSpot', category: 'productivity', monthly_cost_usd: 2000, vendor_url: 'https://hubspot.com' },
  { id: 'zoom', name: 'Zoom', category: 'comms', monthly_cost_usd: 500, vendor_url: 'https://zoom.us' },
  { id: 'linear', name: 'Linear', category: 'productivity', monthly_cost_usd: 640, vendor_url: 'https://linear.app' },
];

export interface ScenarioDefinition {
  name: string;
  description: string;
  totalEmployees: number;
  departments: Record<string, number>;
  repoCount: number;
  projectCount: number;
  tools: SaaSToolInput[];
}

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  enterprise_1000: {
    name: 'Enterprise 1000',
    description: 'Full 1000-person enterprise with 8 departments, 45 repos, 38 projects, and 5 engineered SPOFs',
    totalEmployees: 1000,
    departments: {
      Engineering: 300, Product: 150, Design: 100, Marketing: 150,
      Sales: 100, Data: 80, Ops: 70, HR: 50,
    },
    repoCount: 45, projectCount: 38, tools: STANDARD_TOOLS,
  },
  startup_50: {
    name: 'Startup 50',
    description: '50-person startup with 3 departments, 8 repos, 5 projects, and 2 obvious SPOFs',
    totalEmployees: 50,
    departments: { Engineering: 25, Product: 15, Operations: 10 },
    repoCount: 8, projectCount: 5,
    tools: STANDARD_TOOLS.filter(t => ['github', 'slack', 'jira', 'aws', 'linear'].includes(t.id)),
  },
  mid_market_200: {
    name: 'Mid-Market 200',
    description: '200-person pre-IPO company with 5 departments, 20 repos, 15 projects',
    totalEmployees: 200,
    departments: { Engineering: 80, Product: 40, Design: 25, Marketing: 30, Sales: 25 },
    repoCount: 20, projectCount: 15,
    tools: STANDARD_TOOLS.filter(t => ['github', 'slack', 'jira', 'notion', 'figma', 'aws', 'datadog', 'salesforce'].includes(t.id)),
  },
};

export function getScenario(name: string): ScenarioDefinition {
  const scenario = SCENARIOS[name];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${name}. Available: ${Object.keys(SCENARIOS).join(', ')}`);
  }
  return scenario;
}
