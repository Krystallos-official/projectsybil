import { upsertEmployee, upsertEmployeeBatch, EmployeeInput } from '../../neo4j/queries/employees';
import {
  upsertProject, upsertProjectBatch, ProjectInput,
  upsertRepository, upsertRepositoryBatch, RepositoryInput,
  upsertSaaSTool, upsertSaaSToolBatch, SaaSToolInput,
  linkRepoToProject, linkProjectDependency,
} from '../../neo4j/queries/projects';
import { mergeWeight, setOwnership } from '../../neo4j/queries/relationships';
import { runQuery } from '../../neo4j/driver';
import pino from 'pino';

const logger = pino({ name: 'mock:generator' });

// Seeded random for reproducibility
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

const FIRST_NAMES = ['Alex','Sam','Jordan','Taylor','Morgan','Casey','Riley','Jamie','Avery','Quinn','Cameron','Drew','Sage','River','Skyler','Rowan','Hayden','Emery','Finley','Dakota','Reese','Charlie','Elliot','Harper','Logan','Parker','Sawyer','Blake','Dylan','Kai','Lennox','Oakley','Phoenix','Remy','Sterling','Tatum','Wren','Zion','Arden','Bellamy','Briar','Campbell','Devin','Ellis','Flynn','Greer','Haven','Indigo','Jules','Keegan','Lane','Maddox','Noel','Orion','Palmer','Raven','Shay','Teagan','Uri','Vesper','Winter','Xen','Yael','Zephyr','Aidan','Brennan','Cassidy','Darcy','Eden','Fallon','Glenn','Hollis','Ira','Jade','Kendall','Linden','Milan','Nico','Olive','Presley','Quincy','Reed','Sloane','True','Uma','Vale','Wynne','Adair','Baylor','Clancy','Dara','Elan','Faye','Gray','Heath','Ivory','Joss','Kit','Lark','Merritt','Nyx'];
const LAST_NAMES = ['Chen','Park','Webb','Singh','Patel','Kim','Lee','Garcia','Martinez','Johnson','Williams','Brown','Jones','Davis','Miller','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Robinson','Clark','Lewis','Walker','Hall','Allen','Young','King','Wright','Lopez','Hill','Scott','Green','Adams','Baker','Nelson','Carter','Mitchell','Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart','Sanchez','Morris','Rogers','Reed','Cook','Morgan','Bell','Murphy','Bailey','Rivera','Cooper','Richardson','Cox','Howard','Ward','Torres','Peterson','Gray','Ramirez','James','Watson','Brooks','Kelly','Sanders','Price','Bennett','Wood','Barnes','Ross','Henderson','Coleman','Jenkins','Perry','Powell','Long','Patterson','Hughes','Flores','Washington','Butler','Simmons','Foster','Gonzalez','Bryant','Alexander','Russell','Griffin','Diaz','Hayes'];

interface ScenarioConfig {
  totalEmployees: number;
  departments: Record<string, number>;
  repoCount: number;
  projectCount: number;
  tools: SaaSToolInput[];
}

export async function generateMockData(config: ScenarioConfig): Promise<{
  employees: number; projects: number; repos: number; relationships: number;
}> {
  const rand = seededRandom(42);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

  let totalRels = 0;
  logger.info({ config: { employees: config.totalEmployees, repos: config.repoCount } }, 'Starting mock data generation');

  // Clear existing data
  await runQuery('MATCH (n) DETACH DELETE n');
  logger.info('Cleared existing graph data');

  // ─── Generate Employees ────────────────────────────
  const employees: EmployeeInput[] = [];
  const deptEntries = Object.entries(config.departments);
  let empIndex = 0;

  for (const [dept, count] of deptEntries) {
    for (let i = 0; i < count; i++) {
      const firstName = FIRST_NAMES[empIndex % FIRST_NAMES.length];
      const lastName = LAST_NAMES[empIndex % LAST_NAMES.length];
      const id = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${empIndex}`;
      employees.push({
        id, name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
        department: dept,
        role: getRoleForDept(dept, rand()),
        hire_date: randomDate(2018, 2024, rand).toISOString().split('T')[0],
        github_login: id, slack_user_id: `U${String(empIndex).padStart(8, '0')}`,
      });
      empIndex++;
    }
  }

  // ─── Inject Named SPOFs ────────────────────────────
  const marcusIdx = employees.findIndex(e => e.department === 'Engineering');
  if (marcusIdx >= 0) {
    employees[marcusIdx] = { ...employees[marcusIdx], id: 'marcus.webb', name: 'Marcus Webb',
      email: 'marcus.webb@company.com', role: 'Senior Engineer', github_login: 'marcus.webb' };
  }
  const priyaIdx = employees.findIndex(e => e.department === 'Data' && e.id !== 'marcus.webb');
  if (priyaIdx >= 0) {
    employees[priyaIdx] = { ...employees[priyaIdx], id: 'priya.anand', name: 'Priya Anand',
      email: 'priya.anand@company.com', role: 'Staff Engineer', github_login: 'priya.anand' };
  }
  const devonIdx = employees.findIndex(e => e.department === 'Product' && e.id !== 'marcus.webb' && e.id !== 'priya.anand');
  if (devonIdx >= 0) {
    employees[devonIdx] = { ...employees[devonIdx], id: 'devon.park', name: 'Devon Park',
      email: 'devon.park@company.com', role: 'Product Manager', github_login: 'devon.park' };
  }

  await upsertEmployeeBatch(employees);
  logger.info({ count: employees.length }, 'Employees created');

  // ─── Generate Departments ──────────────────────────
  for (const [dept, count] of deptEntries) {
    await runQuery(`MERGE (d:Department {id: $id}) SET d.name = $id, d.headcount = $count`, { id: dept, count });
  }

  // ─── Generate SaaS Tools ──────────────────────────
  await upsertSaaSToolBatch(config.tools);
  logger.info({ count: config.tools.length }, 'SaaS tools created');

  // ─── Generate Repositories ─────────────────────────
  const repoNames = ['api-gateway','auth-service','billing-engine','dashboard-ui','data-pipeline','ml-platform',
    'mobile-app','notification-service','payment-processor','search-engine','user-service','analytics-core',
    'infra-terraform','ci-cd-pipeline','docs-site','design-system','sdk-js','sdk-python','internal-tools',
    'etl-framework','monitoring-stack','feature-flags','ab-testing','recommendation-engine','chat-service',
    'file-storage','email-service','webhook-service','rate-limiter','config-service','audit-log',
    'identity-provider','graph-api','streaming-platform','batch-processor','cache-layer','queue-worker',
    'schema-registry','api-docs','load-balancer','cdn-manager','secrets-vault','deploy-bot',
    'metrics-collector','log-aggregator'];
  const languages = ['TypeScript','Python','Go','Rust','Java','Kotlin','Swift'];
  const repos: RepositoryInput[] = [];

  for (let i = 0; i < Math.min(config.repoCount, repoNames.length); i++) {
    repos.push({
      url: `https://github.com/company/${repoNames[i]}`,
      name: repoNames[i], language: pick(languages),
      visibility: rand() > 0.2 ? 'private' : 'public',
      created_at: randomDate(2019, 2024, rand).toISOString().split('T')[0],
    });
  }
  await upsertRepositoryBatch(repos);
  logger.info({ count: repos.length }, 'Repositories created');

  // ─── Generate Projects ─────────────────────────────
  const projectNames = ['Project Atlas','Project Beacon','Project Catalyst','Project Delta','Project Echo',
    'Project Forge','Project Genesis','Project Horizon','Project Ion','Project Jetstream','Project Keystone',
    'Project Lighthouse','Project Meridian','Project Nexus','Project Orbit','Project Prism','Project Quantum',
    'Project Relay','Project Sentinel','Project Titan','Project Unity','Project Vertex','Project Wave',
    'Project Xenon','Project Yield','Project Zenith','Data Migration v3','Platform Redesign','Mobile 2.0',
    'Enterprise SSO','AI Search','Customer Portal','Partner API','Compliance Dashboard','Revenue Analytics',
    'Incident Response','Cost Optimizer','Developer Portal','Security Audit'];
  const projects: ProjectInput[] = [];

  for (let i = 0; i < Math.min(config.projectCount, projectNames.length); i++) {
    const dept = deptEntries[i % deptEntries.length][0];
    projects.push({
      name: projectNames[i],
      description: `${projectNames[i]} — ${dept} initiative`,
      status: pick(['active', 'active', 'active', 'paused', 'at_risk'] as const),
      department: dept, budget_estimate: randInt(50000, 500000),
      created_at: randomDate(2022, 2024, rand).toISOString().split('T')[0],
    });
  }
  await upsertProjectBatch(projects);
  logger.info({ count: projects.length }, 'Projects created');

  // ─── Link repos to projects ────────────────────────
  for (let i = 0; i < repos.length; i++) {
    const projIdx = i % projects.length;
    await linkRepoToProject(repos[i].url, projects[projIdx].name);
  }

  // ─── SPOF 1: Marcus Webb — The Gatekeeper ─────────
  logger.info('Engineering SPOF 1: Marcus Webb (The Gatekeeper)');
  const engineers = employees.filter(e => e.department === 'Engineering' && e.id !== 'marcus.webb');

  // Marcus reviews PRs from 89 engineers
  for (let i = 0; i < Math.min(89, engineers.length); i++) {
    await mergeWeight('marcus.webb', engineers[i].id, 'REVIEWS', randInt(3, 15), {
      repo: pick(repoNames), approval_rate: 0.85 + rand() * 0.15,
    });
    totalRels++;
  }

  // Marcus commits to 22 repos
  for (let i = 0; i < Math.min(22, repos.length); i++) {
    await mergeWeight('marcus.webb', repos[i].url, 'COMMITS_TO', randInt(50, 200), {
      last_commit: new Date().toISOString(), ownership_pct: 0.3 + rand() * 0.5,
    });
    totalRels++;
  }

  // Marcus is sole CODEOWNERS for 7 repos (bus_factor = 1 on 4)
  for (let i = 0; i < 7; i++) {
    await setOwnership('marcus.webb', repos[i].url, 'Repository', 1.0, 'CODEOWNERS');
    if (i < 4) {
      await runQuery(`MATCH (r:Repository {url: $url}) SET r.bus_factor = 1`, { url: repos[i].url });
    }
    totalRels++;
  }

  // Marcus collaborates broadly
  for (let i = 0; i < Math.min(120, engineers.length); i++) {
    await mergeWeight('marcus.webb', engineers[i].id, 'COLLABORATES_WITH', randInt(2, 8), { channels: ['github', 'slack'] });
    await mergeWeight('marcus.webb', engineers[i].id, 'MESSAGES', randInt(5, 30));
    totalRels += 2;
  }

  // ─── SPOF 2: Priya Anand — The Knowledge Node ─────
  logger.info('Engineering SPOF 2: Priya Anand (The Knowledge Node)');
  // Priya is assigned to 12 projects as sole data contact
  for (let i = 0; i < Math.min(12, projects.length); i++) {
    await mergeWeight('priya.anand', projects[i].name, 'ASSIGNED_TO', randInt(5, 20));
    totalRels++;
  }
  // 67 unique employees mention Priya monthly
  const allNonPriya = employees.filter(e => e.id !== 'priya.anand');
  for (let i = 0; i < Math.min(67, allNonPriya.length); i++) {
    await mergeWeight(allNonPriya[i].id, 'priya.anand', 'MESSAGES', randInt(3, 15));
    totalRels++;
  }
  // Priya collaborates across departments
  for (let i = 0; i < Math.min(50, allNonPriya.length); i++) {
    await mergeWeight('priya.anand', allNonPriya[i].id, 'COLLABORATES_WITH', randInt(1, 5), { channels: ['notion', 'slack'] });
    totalRels++;
  }

  // ─── SPOF 3: AWS — The Tool Overlord ──────────────
  logger.info('Engineering SPOF 3: AWS (The Tool Overlord)');
  for (let i = 0; i < Math.min(31, projects.length); i++) {
    await linkProjectDependency(projects[i].name, 'aws', 'SaaS_Tool', 'hard');
    totalRels++;
  }
  // Many employees use AWS
  for (let i = 0; i < Math.min(200, employees.length); i++) {
    await mergeWeight(employees[i].id, 'aws', 'USES', 1);
    totalRels++;
  }

  // ─── SPOF 4: Devon Park — The Invisible Bridge ────
  logger.info('Engineering SPOF 4: Devon Park (The Invisible Bridge)');
  const departments = Object.keys(config.departments);
  for (const dept of departments) {
    const deptMembers = employees.filter(e => e.department === dept && e.id !== 'devon.park');
    const bridgeCount = Math.min(randInt(8, 20), deptMembers.length);
    for (let i = 0; i < bridgeCount; i++) {
      const weight = dept === 'Engineering' ? randInt(20, 50) : randInt(5, 25);
      await mergeWeight('devon.park', deptMembers[i].id, 'COLLABORATES_WITH', weight, { channels: ['slack', 'jira'] });
      await mergeWeight('devon.park', deptMembers[i].id, 'MESSAGES', weight);
      totalRels += 2;
    }
  }

  // ─── SPOF 5: Tool Redundancy (HubSpot + Salesforce) ─
  logger.info('Engineering SPOF 5: Tool Redundancy');
  const marketingEmps = employees.filter(e => e.department === 'Marketing');
  const salesEmps = employees.filter(e => e.department === 'Sales');
  for (const emp of marketingEmps) {
    await mergeWeight(emp.id, 'hubspot', 'USES', 1);
    await mergeWeight(emp.id, 'salesforce', 'USES', 1);
    totalRels += 2;
  }
  for (const emp of salesEmps) {
    await mergeWeight(emp.id, 'salesforce', 'USES', 1);
    totalRels++;
  }
  await runQuery(`MATCH (t:SaaS_Tool {id: 'hubspot'}) SET t.redundancy_tools = ['salesforce']`);
  await runQuery(`MATCH (t:SaaS_Tool {id: 'salesforce'}) SET t.redundancy_tools = ['hubspot']`);

  // ─── General Relationships ─────────────────────────
  logger.info('Generating general collaboration relationships');
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    // Each employee collaborates with 5-20 colleagues (same dept more likely)
    const collabCount = randInt(5, 20);
    for (let j = 0; j < collabCount; j++) {
      const sameDept = rand() > 0.3;
      const candidates = sameDept
        ? employees.filter(e => e.department === emp.department && e.id !== emp.id)
        : employees.filter(e => e.id !== emp.id);
      if (candidates.length === 0) continue;
      const target = pick(candidates);
      await mergeWeight(emp.id, target.id, 'COLLABORATES_WITH', randInt(1, 5), { channels: [pick(['slack', 'github', 'jira'])] });
      totalRels++;
    }
    // Assign to 1-3 projects
    const projCount = randInt(1, 3);
    for (let j = 0; j < projCount; j++) {
      await mergeWeight(emp.id, pick(projects).name, 'ASSIGNED_TO', randInt(1, 5));
      totalRels++;
    }
    // Commit to 1-4 repos (if engineering-adjacent)
    if (['Engineering', 'Data', 'Ops'].includes(emp.department)) {
      const repoCount = randInt(1, 4);
      for (let j = 0; j < repoCount; j++) {
        const repo = pick(repos);
        await mergeWeight(emp.id, repo.url, 'COMMITS_TO', randInt(1, 30));
        totalRels++;
      }
    }
    // Use tools
    const toolCount = randInt(2, 5);
    for (let j = 0; j < toolCount; j++) {
      await mergeWeight(emp.id, pick(config.tools).id, 'USES', 1);
      totalRels++;
    }
    // Log progress every 100 employees
    if (i > 0 && i % 100 === 0) {
      logger.info({ progress: `${i}/${employees.length}` }, 'Employee relationships progress');
    }
  }

  logger.info({ employees: employees.length, projects: projects.length, repos: repos.length, relationships: totalRels },
    'Mock data generation complete');

  return { employees: employees.length, projects: projects.length, repos: repos.length, relationships: totalRels };
}

function getRoleForDept(dept: string, r: number): string {
  const roles: Record<string, string[]> = {
    Engineering: ['Software Engineer', 'Senior Engineer', 'Staff Engineer', 'Principal Engineer', 'Engineering Manager'],
    Product: ['Product Manager', 'Senior PM', 'Group PM', 'Product Analyst'],
    Design: ['Product Designer', 'Senior Designer', 'Design Lead', 'UX Researcher'],
    Marketing: ['Marketing Manager', 'Content Strategist', 'Growth Lead', 'Brand Manager'],
    Sales: ['Account Executive', 'Sales Manager', 'SDR', 'Sales Engineer'],
    Data: ['Data Engineer', 'Data Scientist', 'Analytics Engineer', 'ML Engineer'],
    Ops: ['DevOps Engineer', 'SRE', 'Platform Engineer', 'Cloud Architect'],
    HR: ['HR Business Partner', 'Recruiter', 'People Ops', 'Talent Lead'],
  };
  const deptRoles = roles[dept] || ['Specialist'];
  return deptRoles[Math.floor(r * deptRoles.length)];
}

function randomDate(startYear: number, endYear: number, rand: () => number): Date {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + rand() * (end - start));
}
