export interface GitHubCommitAuthor {
  login: string;
  email: string;
  name: string;
  avatar_url: string;
}

export interface GitHubCommit {
  sha: string;
  author: GitHubCommitAuthor | null;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  visibility: string;
  created_at: string;
  pushed_at: string;
  default_branch: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
}

export interface GitHubReview {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
  submitted_at: string;
}

export interface GitHubCodeOwnersEntry {
  pattern: string;
  owners: string[];
}

export interface CommitStats {
  author: string;
  count: number;
  percentage: number;
}
