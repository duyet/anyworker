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
  category: "rag" | "research" | "banking" | "automation";
};

export const USE_CASE_TEMPLATES: UseCaseTemplate[] = [
  {
    id: "local-rag",
    title: "Local RAG",
    description: "Index your local files (pdf, xlsx, csv, txt) and ask questions about them. No data leaves your machine.",
    icon: "FileSearch",
    prompt: "Index my project files and help me understand the codebase. I need a RAG pipeline that can answer questions about my local documents.",
    category: "rag",
  },
  {
    id: "deep-research",
    title: "Deep Research",
    description: "Research any topic by searching the web, reading PDFs and synthesizing findings into a comprehensive report.",
    icon: "Search",
    prompt: "Research [topic] thoroughly. Search the web, read multiple sources, and synthesize a comprehensive report with key findings, data points, and citations.",
    category: "research",
  },
  {
    id: "banking-analysis",
    title: "Banking Analysis",
    description: "Analyze financial statements, detect fraud patterns, and generate compliance reports from spreadsheets and PDFs.",
    icon: "Landmark",
    prompt: "Analyze these financial documents for fraud detection, risk assessment, and compliance. Extract key metrics, flag anomalies, and generate a summary report.",
    category: "banking",
  },
  {
    id: "automation-test",
    title: "Test Prompts",
    description: "Define test cases for your prompts, run batch evaluations, and track performance over time.",
    icon: "FlaskConical",
    prompt: "Run automated tests on my prompt sets. Define expected outputs, batch execute across models, and report pass/fail rates.",
    category: "automation",
  },
];
