import { AxiosInstance } from 'axios';
import { mergeWeight } from '../../neo4j/queries/relationships';
import { linkProjectDependency } from '../../neo4j/queries/projects';
import { JiraSearchResponse } from './types';
import pino from 'pino';

const logger = pino({ name: 'jira:dependencies' });

/**
 * Ingest issue dependencies — creates BLOCKS relationships between people
 * and DEPENDS_ON relationships between projects.
 */
export async function ingestIssueDependencies(
  client: AxiosInstance
): Promise<{ nodes: number; relationships: number; errors: string[] }> {
  let nodesCreated = 0;
  let relsCreated = 0;
  const errors: string[] = [];

  // Search for issues with issue links
  const jql = 'issueLink is not EMPTY AND updated >= -90d';
  const fields = 'summary,assignee,project,issuelinks,issuetype';
  let startAt = 0;
  const maxResults = 100;
  let total = 0;

  // Track project-level dependencies to avoid duplicates
  const projectDeps = new Set<string>();

  do {
    try {
      const response = await client.get<JiraSearchResponse>('/rest/api/3/search', {
        params: { jql, fields, startAt, maxResults },
      });

      const data = response.data;
      total = data.total;

      for (const issue of data.issues) {
        const issueLinks = issue.fields.issuelinks || [];

        for (const link of issueLinks) {
          try {
            // Process blocking relationships
            if (
              link.type.name === 'Blocks' ||
              link.type.outward === 'blocks' ||
              link.type.inward === 'is blocked by'
            ) {
              // This issue blocks the outward issue
              if (link.outwardIssue) {
                const blockerAssignee = issue.fields.assignee;
                const blockedAssignee = link.outwardIssue.fields?.assignee;

                if (blockerAssignee?.accountId && blockedAssignee?.accountId) {
                  await mergeWeight(
                    blockerAssignee.accountId,
                    blockedAssignee.accountId,
                    'BLOCKS',
                    1
                  );
                  relsCreated++;
                }

                // Cross-project dependencies
                const sourceProject = issue.fields.project.name;
                const targetProject = link.outwardIssue.fields?.project?.name;
                if (targetProject && sourceProject !== targetProject) {
                  const depKey = `${sourceProject}→${targetProject}`;
                  if (!projectDeps.has(depKey)) {
                    projectDeps.add(depKey);

                    // Check if this is an epic-level dependency (hard) or task-level (soft)
                    const isEpic = issue.fields.issuetype?.name === 'Epic';
                    const criticality = isEpic ? 'hard' : 'soft';

                    try {
                      await linkProjectDependency(
                        sourceProject,
                        targetProject,
                        'Project',
                        criticality
                      );
                      relsCreated++;
                    } catch {
                      // Projects may not exist yet — that's okay
                    }
                  }
                }
              }

              // This issue is blocked by the inward issue
              if (link.inwardIssue) {
                const blockedAssignee = issue.fields.assignee;
                const blockerAssignee = link.inwardIssue.fields?.assignee;

                if (blockerAssignee?.accountId && blockedAssignee?.accountId) {
                  await mergeWeight(
                    blockerAssignee.accountId,
                    blockedAssignee.accountId,
                    'BLOCKS',
                    1
                  );
                  relsCreated++;
                }
              }
            }
          } catch (error) {
            const msg = `Error processing link for ${issue.key}: ${
              error instanceof Error ? error.message : error
            }`;
            logger.warn(msg);
            errors.push(msg);
          }
        }
      }

      startAt += data.issues.length;
    } catch (error) {
      const msg = `Jira dependency search failed at offset ${startAt}: ${
        error instanceof Error ? error.message : error
      }`;
      logger.error(msg);
      errors.push(msg);
      break;
    }
  } while (startAt < total);

  logger.info({
    projectDependencies: projectDeps.size,
    relsCreated,
  }, 'Jira dependency ingestion complete');

  return { nodes: nodesCreated, relationships: relsCreated, errors };
}
