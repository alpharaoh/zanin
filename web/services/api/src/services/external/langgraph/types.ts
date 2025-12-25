export interface Thread {
  thread_id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface RunInput {
  messages?: Message[];
  [key: string]: unknown;
}

export interface Run {
  run_id: string;
  thread_id: string;
  assistant_id: string;
  status: "pending" | "running" | "success" | "error" | "timeout";
  created_at: string;
  updated_at: string;
}

export interface RunOutput {
  messages?: Message[];
  [key: string]: unknown;
}

export interface ThreadState {
  values: Record<string, unknown>;
  next: string[];
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Assistant {
  assistant_id: string;
  graph_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface StreamEvent {
  event: string;
  data: unknown;
}
