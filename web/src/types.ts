export type Task = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
  doneAt?: string;
  due?: string;
};

export type Trace = {
  id: string;
  method: string;
  url: string;
  requestBody?: string;
  status: number;
  durationMs: number;
  responseBody: string;
  handler: string;
  concepts: string[];
  at: string;
};
