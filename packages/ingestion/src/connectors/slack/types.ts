export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  profile: {
    email: string;
    display_name: string;
    image_72: string;
  };
  is_bot: boolean;
  deleted: boolean;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  num_members: number;
  topic: { value: string };
  purpose: { value: string };
}

export interface SlackMessage {
  user: string;
  text: string;
  ts: string;
  type: string;
  reactions?: SlackReaction[];
}

export interface SlackReaction {
  name: string;
  count: number;
  users: string[];
}

export interface SlackMentionMatch {
  userId: string;
}
