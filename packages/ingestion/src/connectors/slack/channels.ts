import { WebClient } from '@slack/web-api';
import { mergeWeight } from '../../neo4j/queries/relationships';
import pino from 'pino';

const logger = pino({ name: 'slack:channels' });

/**
 * Ingest channel membership to create COLLABORATES_WITH relationships.
 * Co-presence in a channel is a weak but valuable collaboration signal.
 */
export async function ingestChannelMembership(
  client: WebClient
): Promise<{ nodes: number; relationships: number; errors: string[] }> {
  let nodesCreated = 0;
  let relsCreated = 0;
  const errors: string[] = [];

  try {
    // Get all channels
    const channelsResult = await client.conversations.list({
      types: 'public_channel,private_channel',
      limit: 1000,
      exclude_archived: true,
    });

    const channels = channelsResult.channels || [];
    logger.info({ channelCount: channels.length }, 'Processing channel memberships');

    for (const channel of channels) {
      if (!channel.id || !channel.name) continue;

      try {
        // Get channel members
        let allMembers: string[] = [];
        let cursor: string | undefined = undefined;

        do {
          const membersResult = await client.conversations.members({
            channel: channel.id,
            limit: 1000,
            cursor,
          });

          const members = membersResult.members || [];
          allMembers = allMembers.concat(members);
          cursor = membersResult.response_metadata?.next_cursor || undefined;
        } while (cursor);

        logger.debug({
          channel: channel.name,
          memberCount: allMembers.length,
        }, 'Processing channel members');

        // Create COLLABORATES_WITH for each unique pair
        // Limit to channels with < 100 members to avoid O(n²) explosion
        if (allMembers.length > 100) {
          logger.info({
            channel: channel.name,
            memberCount: allMembers.length,
          }, 'Skipping large channel for co-presence (>100 members)');
          continue;
        }

        for (let i = 0; i < allMembers.length; i++) {
          for (let j = i + 1; j < allMembers.length; j++) {
            const u1 = allMembers[i];
            const u2 = allMembers[j];

            // Create bidirectional co-presence
            await mergeWeight(u1, u2, 'COLLABORATES_WITH', 1, {
              channels: [channel.name],
            });
            relsCreated++;
          }
        }
      } catch (error) {
        const msg = `Error processing channel ${channel.name}: ${
          error instanceof Error ? error.message : error
        }`;
        logger.warn(msg);
        errors.push(msg);
      }
    }
  } catch (error) {
    const msg = `Failed to list channels: ${error instanceof Error ? error.message : error}`;
    logger.error(msg);
    errors.push(msg);
  }

  return { nodes: nodesCreated, relationships: relsCreated, errors };
}
