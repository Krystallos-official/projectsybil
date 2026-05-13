import { Octokit } from '@octokit/rest';
import { upsertEmployee } from '../../neo4j/queries/employees';
import { mergeWeight } from '../../neo4j/queries/relationships';
import { runQuery } from '../../neo4j/driver';
import pino from 'pino';

const logger = pino({ name: 'github:pullRequests' });

/**
 * Ingest pull requests and reviews from organization repos.
 * Creates REVIEWS relationships between PR authors and reviewers.
 * Calculates approval_rate per reviewer-author pair.
 */
export async function ingestPullRequests(
  octokit: Octokit,
  org: string,
  since: Date,
  repoFilter?: string[]
): Promise<{ nodes: number; relationships: number; errors: string[] }> {
  let nodesCreated = 0;
  let relsCreated = 0;
  const errors: string[] = [];

  // Get all org repos
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

  // Track review stats for approval_rate calculation
  const reviewStats = new Map<string, { approved: number; total: number }>();

  for (const repo of repos) {
    try {
      // Fetch PRs updated since the since date
      const pulls = await octokit.paginate(octokit.pulls.list, {
        owner: org,
        repo: repo.name,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });

      // Filter to PRs updated since our since date
      const recentPulls = pulls.filter(
        (pr) => new Date(pr.updated_at) >= since
      );

      logger.info({ repo: repo.name, prCount: recentPulls.length }, 'Processing pull requests');

      for (const pr of recentPulls) {
        const prAuthor = pr.user?.login;
        if (!prAuthor) continue;
        if (prAuthor.endsWith('[bot]') || prAuthor.includes('bot')) continue;

        // Upsert PR author
        await upsertEmployee({
          id: prAuthor,
          name: prAuthor,
          email: `${prAuthor}@github`,
          department: 'Engineering',
          role: 'Engineer',
          avatar_url: pr.user?.avatar_url,
          github_login: prAuthor,
        });
        nodesCreated++;

        // Get reviews for this PR
        try {
          const reviews = await octokit.paginate(octokit.pulls.listReviews, {
            owner: org,
            repo: repo.name,
            pull_number: pr.number,
            per_page: 100,
          });

          for (const review of reviews) {
            const reviewerLogin = review.user?.login;
            if (!reviewerLogin) continue;
            if (reviewerLogin === prAuthor) continue; // Skip self-reviews
            if (reviewerLogin.endsWith('[bot]')) continue;

            // Only count substantive reviews
            if (review.state !== 'APPROVED' && review.state !== 'CHANGES_REQUESTED') {
              continue;
            }

            // Upsert reviewer
            await upsertEmployee({
              id: reviewerLogin,
              name: reviewerLogin,
              email: `${reviewerLogin}@github`,
              department: 'Engineering',
              role: 'Engineer',
              avatar_url: review.user?.avatar_url,
              github_login: reviewerLogin,
            });
            nodesCreated++;

            // Merge REVIEWS relationship: reviewer → PR author
            await mergeWeight(reviewerLogin, prAuthor, 'REVIEWS', 1, {
              repo: repo.name,
              last_review_date: review.submitted_at || new Date().toISOString(),
            });
            relsCreated++;

            // Track approval stats for this reviewer-author pair
            const key = `${reviewerLogin}→${prAuthor}`;
            if (!reviewStats.has(key)) {
              reviewStats.set(key, { approved: 0, total: 0 });
            }
            const stats = reviewStats.get(key)!;
            stats.total++;
            if (review.state === 'APPROVED') {
              stats.approved++;
            }
          }
        } catch (reviewError) {
          const msg = `Error fetching reviews for ${repo.name}#${pr.number}: ${
            reviewError instanceof Error ? reviewError.message : reviewError
          }`;
          logger.warn(msg);
          errors.push(msg);
        }
      }
    } catch (error) {
      const msg = `Error processing PRs for ${repo.name}: ${
        error instanceof Error ? error.message : error
      }`;
      logger.error(msg);
      errors.push(msg);
    }
  }

  // Write approval_rate to all REVIEWS relationships
  for (const [key, stats] of reviewStats) {
    const [reviewer, author] = key.split('→');
    if (reviewer && author && stats.total > 0) {
      const approvalRate = stats.approved / stats.total;
      try {
        await runQuery(
          `
          MATCH (reviewer:Employee {id: $reviewer})-[r:REVIEWS]->(author:Employee {id: $author})
          SET r.approval_rate = $approvalRate
          `,
          { reviewer, author, approvalRate }
        );
      } catch (error) {
        logger.warn(`Failed to set approval_rate for ${key}: ${error}`);
      }
    }
  }

  logger.info({ reviewPairs: reviewStats.size }, 'Approval rates computed');

  return { nodes: nodesCreated, relationships: relsCreated, errors };
}
