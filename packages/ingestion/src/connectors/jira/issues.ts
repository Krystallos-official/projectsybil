import axios, { AxiosInstance } from 'axios';
import { upsertEmployee } from '../../neo4j/queries/employees';
import { upsertProject } from '../../neo4j/queries/projects';
import { mergeWeight } from '../../neo4j/queries/relationships';
import { JiraSearchResponse, JiraIssue } from './types';
import pino from 'pino';

const logger = pino({ name: 'jira:issues' });

/**
 * Ingest Jira issues — creates Employee, Project nodes and ASSIGNED_TO relationships.
 */
export async function ingestIssues(
  client: AxiosInstance,
  host: string
): Promise<{ nodes: number; relationships: number; errors: string[] }> {
  let nodesCreated = 0;
  let relsCreated = 0;
  const errors: string[] = [];

  const jql = 'project is not EMPTY AND updated >= -90d';
  const fields = 'summary,assignee,reporter,project,status,created,updated,parent,subtasks,issuetype';
  let startAt = 0;
  const maxResults = 100;
  let total = 0;

  // Track projects we've seen
  const seenProjects = new Set<string>();

  do {
    try {
      const response = await client.get<JiraSearchResponse>('/rest/api/3/search', {
        params: {
          jql,
          fields,
          startAt,
          maxResults,
        },
      });

      const data = response.data;
      total = data.total;

      logger.info({
        startAt,
        fetched: data.issues.length,
        total,
      }, 'Fetching Jira issues');

      for (const issue of data.issues) {
        try {
          await processIssue(issue, seenProjects);
          nodesCreated++;
          relsCreated++;
        } catch (error) {
          const msg = `Error processing issue ${issue.key}: ${
            error instanceof Error ? error.message : error
          }`;
          logger.warn(msg);
          errors.push(msg);
        }
      }

      startAt += data.issues.length;
    } catch (error) {
      const msg = `Jira search failed at offset ${startAt}: ${
        error instanceof Error ? error.message : error
      }`;
      logger.error(msg);
      errors.push(msg);
      break;
    }
  } while (startAt < total);

  logger.info({
    totalIssues: total,
    nodesCreated,
    relsCreated,
  }, 'Jira issue ingestion complete');

  return { nodes: nodesCreated, relationships: relsCreated, errors };
}

async function processIssue(
  issue: JiraIssue,
  seenProjects: Set<string>
): Promise<void> {
  const assignee = issue.fields.assignee;
  const project = issue.fields.project;

  // Upsert project if not seen
  if (!seenProjects.has(project.name)) {
    await upsertProject({
      name: project.name,
      description: `Jira project: ${project.key}`,
      status: 'active',
      department: 'Unknown', // Would need additional Jira API call
      created_at: issue.fields.created?.split('T')[0],
    });
    seenProjects.add(project.name);
  }

  // Upsert assignee and create ASSIGNED_TO relationship
  if (assignee && assignee.accountId) {
    await upsertEmployee({
      id: assignee.accountId,
      name: assignee.displayName,
      email: assignee.emailAddress || `${assignee.accountId}@jira`,
      department: 'Unknown',
      role: 'Unknown',
      avatar_url: assignee.avatarUrls?.['48x48'],
      jira_account_id: assignee.accountId,
    });

    await mergeWeight(assignee.accountId, project.name, 'ASSIGNED_TO', 1, {
      avg_completion_days: 0,
    });
  }

  // Also track reporter as a weaker signal
  const reporter = issue.fields.reporter;
  if (reporter && reporter.accountId && reporter.accountId !== assignee?.accountId) {
    await upsertEmployee({
      id: reporter.accountId,
      name: reporter.displayName,
      email: reporter.emailAddress || `${reporter.accountId}@jira`,
      department: 'Unknown',
      role: 'Unknown',
      avatar_url: reporter.avatarUrls?.['48x48'],
      jira_account_id: reporter.accountId,
    });
  }
}
