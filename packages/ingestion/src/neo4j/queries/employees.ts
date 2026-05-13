import { runQuery, runBatchedWrite } from '../driver';

export interface EmployeeInput {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  avatar_url?: string;
  hire_date?: string;
  github_login?: string;
  slack_user_id?: string;
  jira_account_id?: string;
}

export async function upsertEmployee(employee: EmployeeInput): Promise<void> {
  await runQuery(
    `
    MERGE (e:Employee {id: $id})
    SET e.name = $name,
        e.email = $email,
        e.department = $department,
        e.role = $role,
        e.avatar_url = COALESCE($avatar_url, e.avatar_url),
        e.hire_date = CASE WHEN $hire_date IS NOT NULL THEN date($hire_date) ELSE e.hire_date END,
        e.github_login = COALESCE($github_login, e.github_login),
        e.slack_user_id = COALESCE($slack_user_id, e.slack_user_id),
        e.jira_account_id = COALESCE($jira_account_id, e.jira_account_id)
    WITH e
    MERGE (d:Department {id: $department})
    ON CREATE SET d.name = $department, d.headcount = 0
    MERGE (e)-[:BELONGS_TO]->(d)
    WITH d
    SET d.headcount = SIZE([(emp:Employee)-[:BELONGS_TO]->(d) | emp])
    `,
    {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      department: employee.department,
      role: employee.role,
      avatar_url: employee.avatar_url || null,
      hire_date: employee.hire_date || null,
      github_login: employee.github_login || null,
      slack_user_id: employee.slack_user_id || null,
      jira_account_id: employee.jira_account_id || null,
    }
  );
}

export async function upsertEmployeeBatch(employees: EmployeeInput[]): Promise<number> {
  return runBatchedWrite(
    `
    UNWIND $batch AS emp
    MERGE (e:Employee {id: emp.id})
    SET e.name = emp.name,
        e.email = emp.email,
        e.department = emp.department,
        e.role = emp.role,
        e.avatar_url = COALESCE(emp.avatar_url, e.avatar_url),
        e.hire_date = CASE WHEN emp.hire_date IS NOT NULL THEN date(emp.hire_date) ELSE e.hire_date END,
        e.github_login = COALESCE(emp.github_login, e.github_login),
        e.slack_user_id = COALESCE(emp.slack_user_id, e.slack_user_id),
        e.jira_account_id = COALESCE(emp.jira_account_id, e.jira_account_id)
    WITH e, emp
    MERGE (d:Department {id: emp.department})
    ON CREATE SET d.name = emp.department, d.headcount = 0
    MERGE (e)-[:BELONGS_TO]->(d)
    `,
    employees
  );
}

export async function getEmployee(id: string): Promise<Record<string, unknown> | null> {
  const results = await runQuery(
    `
    MATCH (e:Employee {id: $id})
    OPTIONAL MATCH (e)-[:BELONGS_TO]->(d:Department)
    RETURN e, d.name AS department_name
    `,
    { id }
  );
  return results.length > 0 ? results[0] : null;
}

export async function getAllEmployees(): Promise<Record<string, unknown>[]> {
  return runQuery(`
    MATCH (e:Employee)
    RETURN e
    ORDER BY e.fragility_score DESC
  `);
}

export async function getEmployeesByRiskTier(tier: string): Promise<Record<string, unknown>[]> {
  return runQuery(
    `
    MATCH (e:Employee {risk_tier: $tier})
    RETURN e
    ORDER BY e.fragility_score DESC
    `,
    { tier }
  );
}

export async function updateDepartmentHeadcounts(): Promise<void> {
  await runQuery(`
    MATCH (d:Department)
    SET d.headcount = SIZE([(e:Employee)-[:BELONGS_TO]->(d) | e])
  `);
}
