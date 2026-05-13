import { Octokit } from '@octokit/rest';
import { upsertEmployee } from '../../neo4j/queries/employees';
import { upsertRepository } from '../../neo4j/queries/projects';
import { mergeWeight, setOwnership } from '../../neo4j/queries/relationships';
import { CommitStats } from './types';
import pino from 'pino';

const logger = pino({ name: 'github:commits' });

/**
 * Ingest all commits from the organization's repositories.
 * Creates Employee and Repository nodes, COMMITS_TO relationships,
 * calculates ownership percentages, and computes bus factor.
 */
export async function ingestCommits(
  octokit: Octokit,
  org: string,
  since: Date,
  repoFilter?: string[]
): Promise<{ nodes: number; relationships: number; errors: string[] }> {
  let nodesCreated = 0;
  let relsCreated = 0;
  const errors: string[] = [];

  // Step 1: Get all org repos
  logger.info({ org, since: since.toISOString() }, 'Fetching organization repositories');

  let repos;
  try {
    repos = await octokit.paginate(octokit.repos.listForOrg, {
      org,
      type: 'all',
      per_page: 100,
    });
  } catch (error) {
    const msg = `Failed to fetch repos for org ${org}: ${error instanceof Error ? error.message : error}`;
    logger.error(msg);
    errors.push(msg);
    return { nodes: nodesCreated, relationships: relsCreated, errors };
  }

  if (repoFilter && repoFilter.length > 0) {
    repos = repos.filter((r) => repoFilter.includes(r.name));
  }

  logger.info({ repoCount: repos.length }, 'Processing repositories');

  // Step 2: For each repo, fetch commits
  for (const repo of repos) {
    try {
      // Upsert Repository node
      await upsertRepository({
        url: repo.html_url,
        name: repo.name,
        language: repo.language || 'unknown',
        visibility: (repo.visibility === 'public' ? 'public' : 'private') as 'public' | 'private',
        created_at: repo.created_at ? repo.created_at.split('T')[0] : undefined,
        last_push: repo.pushed_at || undefined,
      });
      nodesCreated++;

      // Fetch commits since date
      const commits = await octokit.paginate(octokit.repos.listCommits, {
        owner: org,
        repo: repo.name,
        since: since.toISOString(),
        per_page: 100,
      });

      logger.info({ repo: repo.name, commitCount: commits.length }, 'Processing commits');

      // Track commit counts per author for this repo
      const authorCommitCounts = new Map<string, number>();
      const totalCommits = commits.length;

      // Step 3: Process each commit
      for (const commit of commits) {
        const authorLogin = commit.author?.login;
        if (!authorLogin) continue;

        // Skip bot accounts
        if (authorLogin.endsWith('[bot]') || authorLogin.includes('bot')) continue;

        // Upsert Employee from commit author
        await upsertEmployee({
          id: authorLogin,
          name: commit.commit.author?.name || authorLogin,
          email: commit.commit.author?.email || `${authorLogin}@github`,
          department: 'Engineering', // Default — will be enriched by other connectors
          role: 'Engineer',
          avatar_url: commit.author?.avatar_url,
          github_login: authorLogin,
        });
        nodesCreated++;

        // Merge COMMITS_TO relationship with weight increment
        await mergeWeight(authorLogin, repo.html_url, 'COMMITS_TO', 1, {
          last_commit: commit.commit.author?.date || new Date().toISOString(),
        });
        relsCreated++;

        // Track commit counts
        authorCommitCounts.set(authorLogin, (authorCommitCounts.get(authorLogin) || 0) + 1);
      }

      // Step 4: Calculate ownership_pct per author
      if (totalCommits > 0 && authorCommitCounts.size > 0) {
        const commitStats: CommitStats[] = [];

        for (const [author, count] of authorCommitCounts) {
          const percentage = count / totalCommits;
          commitStats.push({ author, count, percentage });
        }

        // Sort by commit count descending
        commitStats.sort((a, b) => b.count - a.count);

        // Set the top contributor as owner
        const topContributor = commitStats[0];
        if (topContributor) {
          await setOwnership(
            topContributor.author,
            repo.html_url,
            'Repository',
            topContributor.percentage,
            'commit_analysis'
          );
          relsCreated++;
        }

        // Step 5: Calculate bus factor
        let cumulativeCommits = 0;
        let busFactor = 0;
        for (const stat of commitStats) {
          cumulativeCommits += stat.count;
          busFactor++;
          if (cumulativeCommits > totalCommits * 0.5) break;
        }

        // Write bus_factor to repository node
        const { runQuery } = await import('../../neo4j/driver');
        await runQuery(
          `MATCH (r:Repository {url: $url}) SET r.bus_factor = $busFactor`,
          { url: repo.html_url, busFactor }
        );

        logger.info({
          repo: repo.name,
          busFactor,
          topContributor: topContributor.author,
          ownershipPct: (topContributor.percentage * 100).toFixed(1) + '%',
        }, 'Repository stats computed');
      }
    } catch (error) {
      const msg = `Error processing repo ${repo.name}: ${error instanceof Error ? error.message : error}`;
      logger.error(msg);
      errors.push(msg);
    }
  }

  return { nodes: nodesCreated, relationships: relsCreated, errors };
}
