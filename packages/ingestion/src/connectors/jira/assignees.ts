import { AxiosInstance } from 'axios';
import { runQuery } from '../../neo4j/driver';
import pino from 'pino';

const logger = pino({ name: 'jira:assignees' });

/**
 * Compute average completion time per assignee-project pair.
 * Updates ASSIGNED_TO relationship avg_completion_days property.
 */
export async function computeAssigneeMetrics(
  client: AxiosInstance
): Promise<{ updated: number; errors: string[] }> {
  let updated = 0;
  const errors: string[] = [];

  // Query for completed issues with assignees
  const jql = 'status = Done AND resolved >= -90d AND assignee is not EMPTY';
  const fields = 'assignee,project,created,resolutiondate';
  let startAt = 0;
  const maxResults = 100;
  let total = 0;

  // Track completion times: key = "assigneeId→projectName"
  const completionTimes = new Map<string, number[]>();

  do {
    try {
      const response = await client.get('/rest/api/3/search', {
        params: { jql, fields, startAt, maxResults },
      });

      const data = response.data;
      total = data.total;

      for (const issue of data.issues) {
        const assignee = issue.fields.assignee;
        const project = issue.fields.project;
        const created = issue.fields.created;
        const resolved = issue.fields.resolutiondate;

        if (assignee?.accountId && project?.name && created && resolved) {
          const createdDate = new Date(created);
          const resolvedDate = new Date(resolved);
          const daysDiff = (resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

          const key = `${assignee.accountId}→${project.name}`;
          if (!completionTimes.has(key)) {
            completionTimes.set(key, []);
          }
          completionTimes.get(key)!.push(daysDiff);
        }
      }

      startAt += data.issues.length;
    } catch (error) {
      const msg = `Jira assignee metrics search failed: ${
        error instanceof Error ? error.message : error
      }`;
      logger.error(msg);
      errors.push(msg);
      break;
    }
  } while (startAt < total);

  // Write average completion times to ASSIGNED_TO relationships
  for (const [key, times] of completionTimes) {
    const [assigneeId, projectName] = key.split('→');
    if (!assigneeId || !projectName) continue;

    const avgDays = times.reduce((sum, t) => sum + t, 0) / times.length;

    try {
      await runQuery(
        `
        MATCH (e:Employee {id: $assigneeId})-[r:ASSIGNED_TO]->(p:Project {name: $projectName})
        SET r.avg_completion_days = $avgDays
        `,
        { assigneeId, projectName, avgDays: Math.round(avgDays * 10) / 10 }
      );
      updated++;
    } catch (error) {
      const msg = `Failed to update completion time for ${key}: ${
        error instanceof Error ? error.message : error
      }`;
      logger.warn(msg);
      errors.push(msg);
    }
  }

  logger.info({ updated, pairs: completionTimes.size }, 'Assignee metrics computed');

  return { updated, errors };
}
