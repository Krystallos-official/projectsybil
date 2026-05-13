import { Octokit } from '@octokit/rest';
import { setOwnership } from '../../neo4j/queries/relationships';
import { GitHubCodeOwnersEntry } from './types';
import pino from 'pino';

const logger = pino({ name: 'github:reviews' });

/**
 * Ingest CODEOWNERS files from repositories.
 * Creates explicit OWNS relationships from declared code ownership.
 * This provides declared ownership separate from inferred commit-based ownership.
 */
export async function ingestCodeOwnership(
  octokit: Octokit,
  org: string,
  repoFilter?: string[]
): Promise<{ nodes: number; relationships: number; errors: string[] }> {
  let nodesCreated = 0;
  let relsCreated = 0;
  const errors: string[] = [];

  let repos;
  try {
    repos = await octokit.paginate(octokit.repos.listForOrg, {
      org,
      type: 'all',
      per_page: 100,
    });
  } catch (error) {
    const msg = `Failed to fetch repos: ${error instanceof Error ? error.message : error}`;
    logger.error(msg);
    errors.push(msg);
    return { nodes: nodesCreated, relationships: relsCreated, errors };
  }

  if (repoFilter && repoFilter.length > 0) {
    repos = repos.filter((r) => repoFilter.includes(r.name));
  }

  for (const repo of repos) {
    // Try to find CODEOWNERS file in common locations
    const codeownersLocations = [
      'CODEOWNERS',
      '.github/CODEOWNERS',
      'docs/CODEOWNERS',
    ];

    let codeownersContent: string | null = null;

    for (const path of codeownersLocations) {
      try {
        const response = await octokit.repos.getContent({
          owner: org,
          repo: repo.name,
          path,
        });

        if ('content' in response.data && response.data.content) {
          codeownersContent = Buffer.from(
            response.data.content,
            'base64'
          ).toString('utf8');
          logger.info({ repo: repo.name, path }, 'Found CODEOWNERS file');
          break;
        }
      } catch {
        // File doesn't exist at this location — try next
        continue;
      }
    }

    if (!codeownersContent) {
      logger.debug({ repo: repo.name }, 'No CODEOWNERS file found');
      continue;
    }

    // Parse CODEOWNERS format: path_pattern @owner1 @owner2
    const entries = parseCodeOwners(codeownersContent);

    for (const entry of entries) {
      for (const owner of entry.owners) {
        // Strip @ prefix if present
        const ownerLogin = owner.replace(/^@/, '');

        // Skip team mentions (contain /)
        if (ownerLogin.includes('/')) continue;

        try {
          await setOwnership(
            ownerLogin,
            repo.html_url,
            'Repository',
            1.0,
            'CODEOWNERS'
          );
          relsCreated++;

          logger.debug({
            owner: ownerLogin,
            repo: repo.name,
            pattern: entry.pattern,
          }, 'Code ownership recorded');
        } catch (error) {
          const msg = `Failed to set CODEOWNERS for ${ownerLogin} → ${repo.name}: ${
            error instanceof Error ? error.message : error
          }`;
          logger.warn(msg);
          errors.push(msg);
        }
      }
    }
  }

  return { nodes: nodesCreated, relationships: relsCreated, errors };
}

/**
 * Parse a CODEOWNERS file into structured entries.
 * Format: path_pattern @owner1 @owner2
 * Lines starting with # are comments.
 * Empty lines are skipped.
 */
function parseCodeOwners(content: string): GitHubCodeOwnersEntry[] {
  const entries: GitHubCodeOwnersEntry[] = [];

  const lines = content.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;

    // Split into pattern and owners
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;

    const pattern = parts[0];
    const owners = parts.slice(1).filter((p) => p.startsWith('@'));

    if (owners.length > 0) {
      entries.push({ pattern, owners });
    }
  }

  return entries;
}
