export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  last_edited_by: {
    id: string;
    object: string;
  };
  parent: {
    type: string;
    page_id?: string;
    database_id?: string;
    workspace?: boolean;
  };
  properties: Record<string, unknown>;
  url: string;
}

export interface NotionUser {
  id: string;
  name: string;
  avatar_url: string | null;
  type: string;
  person?: {
    email: string;
  };
}

export interface NotionBlock {
  id: string;
  type: string;
  created_by: {
    id: string;
  };
  last_edited_by: {
    id: string;
  };
  has_children: boolean;
}
