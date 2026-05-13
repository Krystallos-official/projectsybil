import { WebClient } from '@slack/web-api';
import { mergeWeight } from '../../neo4j/queries/relationships';
import pino from 'pino';

const logger = pino({ name: 'slack:interactions' });

// Regex to extract @mentions from Slack message text
const MENTION_REGEX = /<@([A-Z0-9]+)>/g;

/**
 * Ingest message interactions from Slack channels.
 * IMPORTANT: We never read message content.
 * We only read metadata: who sent a message, when, and @mentions.
 * Reactions count as half a message-weight interaction.
 */
export async function ingestMessageInteractions(
  client: WebClient,
  channelIds: string[],
  since: Date
): Promise<{ nodes: number; relationships: number; errors: string[] }> {
  let nodesCreated = 0;
  let relsCreated = 0;
  const errors: string[] = [];

  const sinceUnix = (since.getTime() / 1000).toString();

  for (const channelId of channelIds) {
    try {
      let cursor: string | undefined = undefined;
      let messageCount = 0;

      do {
        const historyResult = await client.conversations.history({
          channel: channelId,
          oldest: sinceUnix,
          limit: 200,
          cursor,
        });

        const messages = historyResult.messages || [];

        for (const message of messages) {
          // Skip bot messages and system messages
          if (!message.user || message.subtype) continue;
          messageCount++;

          // Extract @mentions from message text (metadata only — not content)
          if (message.text) {
            const mentions = extractMentions(message.text);
            for (const mentionTarget of mentions) {
              if (mentionTarget === message.user) continue; // Skip self-mentions

              await mergeWeight(message.user, mentionTarget, 'MESSAGES', 1, {
                last_message: message.ts,
              });
              relsCreated++;
            }
          }

          // Process reactions — each reaction counts as 0.5 weight
          if (message.reactions) {
            for (const reaction of message.reactions) {
              if (reaction.users) {
                for (const reactingUser of reaction.users) {
                  if (reactingUser === message.user) continue; // Skip self-reactions

                  await mergeWeight(reactingUser, message.user, 'MESSAGES', 0.5, {
                    last_message: message.ts,
                  });
                  relsCreated++;
                }
              }
            }
          }
        }

        cursor = historyResult.response_metadata?.next_cursor || undefined;
      } while (cursor);

      logger.info({ channelId, messageCount }, 'Channel messages processed');
    } catch (error) {
      const msg = `Error processing channel ${channelId}: ${
        error instanceof Error ? error.message : error
      }`;
      logger.warn(msg);
      errors.push(msg);
    }
  }

  return { nodes: nodesCreated, relationships: relsCreated, errors };
}

/**
 * Extract user IDs from @mentions in Slack message text.
 * Format: <@U1234ABC>
 */
function extractMentions(text: string): string[] {
  const mentions: string[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return [...new Set(mentions)]; // Deduplicate
}

/**
 * Get all channel IDs for interaction ingestion.
 */
export async function getChannelIds(client: WebClient): Promise<string[]> {
  const channelIds: string[] = [];

  try {
    const result = await client.conversations.list({
      types: 'public_channel,private_channel',
      limit: 1000,
      exclude_archived: true,
    });

    for (const channel of result.channels || []) {
      if (channel.id) {
        channelIds.push(channel.id);
      }
    }
  } catch (error) {
    logger.error(`Failed to list channels: ${error instanceof Error ? error.message : error}`);
  }

  return channelIds;
}
