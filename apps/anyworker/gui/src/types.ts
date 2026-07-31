export type ChatItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; name: string; status: "start" | "end"; result?: string }
  | { kind: "status"; text: string }
  | { kind: "error"; text: string }
  | {
      kind: "approval";
      id: string;
      tool: string;
      reason: string;
      args: Record<string, unknown>;
    };

export type UseCaseTemplate = {
  id: string;
  title: string;
  description: string;
  icon: string;
  prompt: string;
  category: "summarize" | "compare" | "spreadsheet" | "write";
};

export const USE_CASE_TEMPLATES: UseCaseTemplate[] = [
  {
    id: "summarize-folder",
    title: "Summarize a folder",
    description: "Read every document in a folder and write one summary that pulls out the key points.",
    icon: "FileSearch",
    prompt: "Read every document in this folder and write a summary that pulls out the key points from each one.",
    category: "summarize",
  },
  {
    id: "compare-documents",
    title: "Compare two documents",
    description: "Read two files and list what changed, what matches, and what is missing between them.",
    icon: "GitCompare",
    prompt: "Read these two documents and list what changed, what matches, and what is missing between them.",
    category: "compare",
  },
  {
    id: "spreadsheet-summary",
    title: "Turn a spreadsheet into a summary",
    description: "Read a spreadsheet and write a plain-English summary of the totals, trends, and outliers.",
    icon: "Table",
    prompt: "Read this spreadsheet and write a plain-English summary of the totals, trends, and outliers.",
    category: "spreadsheet",
  },
  {
    id: "draft-memo",
    title: "Draft a memo from notes",
    description: "Read your notes and draft a memo that lays out the decision, the reasons, and next steps.",
    icon: "PenLine",
    prompt: "Read the notes in this folder and draft a memo that lays out the decision, the reasons, and next steps.",
    category: "write",
  },
];
