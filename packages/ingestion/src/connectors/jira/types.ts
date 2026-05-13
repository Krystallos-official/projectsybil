export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    assignee: JiraUser | null;
    reporter: JiraUser | null;
    project: {
      key: string;
      name: string;
    };
    status: {
      name: string;
      statusCategory: {
        key: string;
      };
    };
    created: string;
    updated: string;
    issuetype: {
      name: string;
    };
    parent?: {
      key: string;
      fields: {
        summary: string;
      };
    };
    subtasks?: JiraIssue[];
    issuelinks?: JiraIssueLink[];
  };
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  avatarUrls: {
    '48x48': string;
  };
  active: boolean;
}

export interface JiraIssueLink {
  id: string;
  type: {
    name: string;
    inward: string;
    outward: string;
  };
  inwardIssue?: {
    key: string;
    fields: {
      summary: string;
      assignee: JiraUser | null;
      project: {
        key: string;
        name: string;
      };
    };
  };
  outwardIssue?: {
    key: string;
    fields: {
      summary: string;
      assignee: JiraUser | null;
      project: {
        key: string;
        name: string;
      };
    };
  };
}

export interface JiraSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}
