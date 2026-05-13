import { runQuery, runBatchedWrite } from '../driver';

export interface ProjectInput {
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'at_risk';
  department: string;
  budget_estimate?: number;
  created_at?: string;
}

export interface RepositoryInput {
  url: string;
  name: string;
  language: string;
  visibility: 'public' | 'private';
  created_at?: string;
  last_push?: string;
}

export interface SaaSToolInput {
  id: string;
  name: string;
  category: 'productivity' | 'dev' | 'design' | 'comms' | 'data';
  monthly_cost_usd?: number;
  vendor_url: string;
}

export async function upsertProject(project: ProjectInput): Promise<void> {
  await runQuery(
    `
    MERGE (p:Project {name: $name})
    SET p.description = $description,
        p.status = $status,
        p.department = $department,
        p.budget_estimate = $budget_estimate,
        p.created_at = CASE WHEN $created_at IS NOT NULL THEN date($created_at) ELSE COALESCE(p.created_at, date()) END
    `,
    {
      name: project.name,
      description: project.description,
      status: project.status,
      department: project.department,
      budget_estimate: project.budget_estimate || null,
      created_at: project.created_at || null,
    }
  );
}

export async function upsertProjectBatch(projects: ProjectInput[]): Promise<number> {
  return runBatchedWrite(
    `
    UNWIND $batch AS proj
    MERGE (p:Project {name: proj.name})
    SET p.description = proj.description,
        p.status = proj.status,
        p.department = proj.department,
        p.budget_estimate = proj.budget_estimate,
        p.created_at = CASE WHEN proj.created_at IS NOT NULL THEN date(proj.created_at) ELSE COALESCE(p.created_at, date()) END
    `,
    projects
  );
}

export async function upsertRepository(repo: RepositoryInput): Promise<void> {
  await runQuery(
    `
    MERGE (r:Repository {url: $url})
    SET r.name = $name,
        r.language = $language,
        r.visibility = $visibility,
        r.created_at = CASE WHEN $created_at IS NOT NULL THEN date($created_at) ELSE COALESCE(r.created_at, date()) END,
        r.last_push = CASE WHEN $last_push IS NOT NULL THEN datetime($last_push) ELSE r.last_push END
    `,
    {
      url: repo.url,
      name: repo.name,
      language: repo.language,
      visibility: repo.visibility,
      created_at: repo.created_at || null,
      last_push: repo.last_push || null,
    }
  );
}

export async function upsertRepositoryBatch(repos: RepositoryInput[]): Promise<number> {
  return runBatchedWrite(
    `
    UNWIND $batch AS repo
    MERGE (r:Repository {url: repo.url})
    SET r.name = repo.name,
        r.language = repo.language,
        r.visibility = repo.visibility,
        r.created_at = CASE WHEN repo.created_at IS NOT NULL THEN date(repo.created_at) ELSE COALESCE(r.created_at, date()) END,
        r.last_push = CASE WHEN repo.last_push IS NOT NULL THEN datetime(repo.last_push) ELSE r.last_push END
    `,
    repos
  );
}

export async function upsertSaaSTool(tool: SaaSToolInput): Promise<void> {
  await runQuery(
    `
    MERGE (t:SaaS_Tool {id: $id})
    SET t.name = $name,
        t.category = $category,
        t.monthly_cost_usd = $monthly_cost_usd,
        t.vendor_url = $vendor_url
    `,
    {
      id: tool.id,
      name: tool.name,
      category: tool.category,
      monthly_cost_usd: tool.monthly_cost_usd || null,
      vendor_url: tool.vendor_url,
    }
  );
}

export async function upsertSaaSToolBatch(tools: SaaSToolInput[]): Promise<number> {
  return runBatchedWrite(
    `
    UNWIND $batch AS tool
    MERGE (t:SaaS_Tool {id: tool.id})
    SET t.name = tool.name,
        t.category = tool.category,
        t.monthly_cost_usd = tool.monthly_cost_usd,
        t.vendor_url = tool.vendor_url
    `,
    tools
  );
}

export async function linkRepoToProject(repoUrl: string, projectName: string): Promise<void> {
  await runQuery(
    `
    MATCH (r:Repository {url: $repoUrl})
    MATCH (p:Project {name: $projectName})
    MERGE (r)-[:PART_OF]->(p)
    `,
    { repoUrl, projectName }
  );
}

export async function linkProjectDependency(
  fromProject: string,
  toTarget: string,
  targetType: 'Project' | 'SaaS_Tool',
  criticality: 'hard' | 'soft'
): Promise<void> {
  const targetMatch =
    targetType === 'Project' ? `(target:Project {name: $toTarget})` : `(target:SaaS_Tool {id: $toTarget})`;

  await runQuery(
    `
    MATCH (p:Project {name: $fromProject})
    MATCH ${targetMatch}
    MERGE (p)-[r:DEPENDS_ON]->(target)
    SET r.criticality = $criticality
    `,
    { fromProject, toTarget, criticality }
  );
}

export async function getAllProjects(): Promise<Record<string, unknown>[]> {
  return runQuery(`
    MATCH (p:Project)
    RETURN p
    ORDER BY p.fragility_score DESC
  `);
}

export async function getAllRepositories(): Promise<Record<string, unknown>[]> {
  return runQuery(`
    MATCH (r:Repository)
    RETURN r
    ORDER BY r.bus_factor ASC
  `);
}
