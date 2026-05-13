import { Client } from '@notionhq/client';
import { runQuery } from '../../neo4j/driver';
import pino from 'pino';

const logger = pino({ name: 'notion:contributors' });

/**
 * Resolve Notion user IDs to existing Employee nodes via email.
 * Similar to Slack identity merge — ensures all platforms
 * converge to the same Employee node.
 */
export async function resolveNotionUsers(
  client: Client
): Promise<{ resolved: number; unresolved: number; errors: string[] }> {
  let resolved = 0;
  let unresolved = 0;
  const errors: string[] = [];

  try {
    const usersResult = await client.users.list({ page_size: 100 });

    for (const user of usersResult.results) {
      if (user.type !== 'person') continue;

      const userData = user as {
        id: string;
        name: string;
        avatar_url: string | null;
        person?: { email: string };
      };

      const email = userData.person?.email;
      if (!email) {
        unresolved++;
        continue;
      }

      try {
        const results = await runQuery(
          `
          MATCH (e:Employee)
          WHERE e.email = $email
          RETURN e.id AS id
          `,
          { email }
        );

        if (results.length > 0) {
          resolved++;
        } else {
          // Create Employee from Notion user
          await runQuery(
            `
            MERGE (e:Employee {id: $notionId})
            SET e.name = COALESCE(e.name, $name),
                e.email = COALESCE(e.email, $email),
                e.department = COALESCE(e.department, 'Unknown'),
                e.role = COALESCE(e.role, 'Unknown'),
                e.avatar_url = COALESCE(e.avatar_url, $avatar)
            `,
            {
              notionId: userData.id,
              name: userData.name || userData.id,
              email,
              avatar: userData.avatar_url,
            }
          );
          unresolved++;
        }
      } catch (error) {
        const msg = `Error resolving Notion user ${userData.id}: ${
          error instanceof Error ? error.message : error
        }`;
        logger.warn(msg);
        errors.push(msg);
      }
    }
  } catch (error) {
    const msg = `Failed to list Notion users: ${error instanceof Error ? error.message : error}`;
    logger.error(msg);
    errors.push(msg);
  }

  logger.info({ resolved, unresolved }, 'Notion identity resolution complete');
  return { resolved, unresolved, errors };
}
