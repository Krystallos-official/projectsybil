import { WebClient } from '@slack/web-api';
import { runQuery } from '../../neo4j/driver';
import pino from 'pino';

const logger = pino({ name: 'slack:mentions' });

/**
 * Resolve Slack user IDs to GitHub logins via email matching.
 * This cross-platform identity merge is essential for graph accuracy —
 * it ensures Slack interactions and GitHub commits are attributed
 * to the same Employee node.
 */
export async function resolveSlackToGithub(
  client: WebClient
): Promise<{ resolved: number; unresolved: number; errors: string[] }> {
  let resolved = 0;
  let unresolved = 0;
  const errors: string[] = [];

  try {
    // Get all Slack users
    const usersResult = await client.users.list({ limit: 1000 });
    const users = usersResult.members || [];

    logger.info({ userCount: users.length }, 'Resolving Slack users to Employee nodes');

    for (const user of users) {
      // Skip bots and deleted users
      if (user.is_bot || user.deleted) continue;
      if (!user.id) continue;

      const email = user.profile?.email;
      if (!email) {
        unresolved++;
        continue;
      }

      try {
        // Try to find Employee node with matching email
        const results = await runQuery(
          `
          MATCH (e:Employee)
          WHERE e.email = $email OR e.email CONTAINS $emailPrefix
          SET e.slack_user_id = $slackId
          RETURN e.id AS id
          `,
          {
            email,
            emailPrefix: email.split('@')[0],
            slackId: user.id,
          }
        );

        if (results.length > 0) {
          resolved++;
          logger.debug({
            slackId: user.id,
            employeeId: (results[0] as Record<string, unknown>).id,
          }, 'Slack user resolved to Employee');
        } else {
          // No matching Employee node — create one from Slack data
          await runQuery(
            `
            MERGE (e:Employee {id: $slackId})
            SET e.name = COALESCE(e.name, $name),
                e.email = COALESCE(e.email, $email),
                e.department = COALESCE(e.department, 'Unknown'),
                e.role = COALESCE(e.role, 'Unknown'),
                e.slack_user_id = $slackId,
                e.avatar_url = COALESCE(e.avatar_url, $avatar)
            `,
            {
              slackId: user.id,
              name: user.real_name || user.name || user.id,
              email,
              avatar: user.profile?.image_72 || null,
            }
          );
          unresolved++;
        }
      } catch (error) {
        const msg = `Error resolving Slack user ${user.id}: ${
          error instanceof Error ? error.message : error
        }`;
        logger.warn(msg);
        errors.push(msg);
      }
    }
  } catch (error) {
    const msg = `Failed to list Slack users: ${error instanceof Error ? error.message : error}`;
    logger.error(msg);
    errors.push(msg);
  }

  logger.info({ resolved, unresolved }, 'Slack identity resolution complete');

  return { resolved, unresolved, errors };
}
