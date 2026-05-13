import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  // Neo4j
  NEO4J_URI: z.string().default('bolt://localhost:7687'),
  NEO4J_USER: z.string().default('neo4j'),
  NEO4J_PASSWORD: z.string().min(1, 'NEO4J_PASSWORD is required'),

  // GitHub
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_ORG: z.string().optional(),

  // Slack
  SLACK_BOT_TOKEN: z.string().optional(),

  // Jira
  JIRA_HOST: z.string().optional(),
  JIRA_EMAIL: z.string().optional(),
  JIRA_TOKEN: z.string().optional(),

  // Notion
  NOTION_TOKEN: z.string().optional(),

  // Analysis service
  ANALYSIS_SERVICE_URL: z.string().default('http://localhost:8000'),

  // App
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3001'),
});

export type Config = z.infer<typeof configSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    const result = configSchema.safeParse(process.env);
    if (!result.success) {
      const errors = result.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      console.error(`\n╔══════════════════════════════════════════╗`);
      console.error(`║  ◈ SYBIL — Configuration Error           ║`);
      console.error(`╚══════════════════════════════════════════╝`);
      console.error(`\nInvalid environment variables:\n${errors}\n`);
      console.error(`Copy .env.example to .env and fill in required values.\n`);
      process.exit(1);
    }
    _config = result.data;
  }
  return _config;
}

export function isConnectorConfigured(connector: string): boolean {
  const config = getConfig();
  switch (connector) {
    case 'github':
      return !!(config.GITHUB_TOKEN && config.GITHUB_ORG);
    case 'slack':
      return !!config.SLACK_BOT_TOKEN;
    case 'jira':
      return !!(config.JIRA_HOST && config.JIRA_EMAIL && config.JIRA_TOKEN);
    case 'notion':
      return !!config.NOTION_TOKEN;
    case 'mock':
      return true;
    default:
      return false;
  }
}
