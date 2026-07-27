/**
 * Every string on the landing page lives here.
 *
 * Sections import from this file and render it — they never contain prose. That
 * is what lets the three design variants stay in sync: same content object,
 * three theme layers. To change wording, change it here.
 */

export type Status = "live" | "soon"

export interface Integration {
  name: string
  /** Key into the LOGOS map in components/landing/logos.tsx. */
  logo: string
  status: Status
  /** Shown on the free-models block only. */
  free?: boolean
}

export const site = {
  name: "AnyWorker",
  domain: "anyworker.dev",
  tagline: "AI that gets your everyday work done.",
  description:
    "AnyWorker is an open AI coworker for people who don't code. It works in your files, inbox and chat, and finishes the task instead of describing it. Free models included.",
} as const

export const nav = {
  links: [
    { label: "How it works", href: "#how-it-works" },
    { label: "Skills", href: "#skills" },
    { label: "Connections", href: "#connections" },
    { label: "Plugins", href: "#plugins" },
  ],
  secondary: { label: "Docs", href: "https://anyrouter.dev" },
  cta: { label: "Start free", href: "#get-started" },
} as const

export const hero = {
  /** Quiet product line — no sparkle badge. */
  eyebrow: "AI coworker for people who don't code",
  headline: [
    { text: "Ask for the outcome.", accent: false },
    { text: "It handles the steps.", accent: true },
  ],
  body: "AnyWorker opens your files, drafts the document, and sends the message. You review finished work. It checks in before anything that matters.",
  primaryCta: { label: "Start free", href: "#get-started" },
  secondaryCta: { label: "See it work", href: "#product-demo" },
  proofPoints: [
    "Free models built in",
    "No API key to set up",
    "Runs your Claude plugins",
  ],
} as const

/**
 * Cursor-style feature relay: timed live product windows over the painted stage.
 * Each scene is interactive UI — not a screenshot carousel.
 */
export const heroRelay = {
  intervalMs: 7000,
  stageAlt: "Oil painting landscape behind the product demo",
  scenes: [
    {
      id: "session",
      label: "Session",
      stage: "peaks" as const,
      caption: "A full coworker app — sessions, progress, and approvals.",
    },
    {
      id: "checkin",
      label: "Approval",
      stage: "peaks" as const,
      caption: "It waits before sending, publishing, or deleting.",
    },
    {
      id: "home",
      label: "Home",
      stage: "coast" as const,
      caption: "Start from a greeting, or pick up an active job.",
    },
    {
      id: "access",
      label: "Access",
      stage: "coast" as const,
      caption: "Browser, files, and tools — only what you grant.",
    },
    {
      id: "automations",
      label: "Schedule",
      stage: "peaks" as const,
      caption: "Hand off recurring work. It keeps going unattended.",
    },
  ],
} as const

/**
 * OpenWorker-style product shell in the hero demo.
 * Three panes: sessions · conversation · progress/artifacts/access.
 */
export const heroStudio = {
  appName: "AnyWorker",
  beta: "Beta",
  newSession: "New session",
  search: "Search",
  automations: "Automations",
  recent: "Recent",
  userName: "You",
  model: "AnyRouter · free",
  statusLabel: "Needs approval",
  statusDone: "Sent",
  statusEdit: "Editing",
  sidebar: {
    sessions: [
      { name: "Board update — Q3", state: "running" as const },
      { name: "Weekly marketing report", state: "scheduled" as const },
      { name: "Inbox triage", state: "done" as const },
    ],
  },
  task: {
    title: "Board update — Q3",
    prompt: "Pull the Q3 numbers and send the board update.",
    steps: [
      {
        label: "Read",
        detail: "Q3-forecast.xlsx",
        tool: "Drive",
        state: "done" as const,
      },
      {
        label: "Checked",
        detail: "3 figures against last month",
        tool: "",
        state: "done" as const,
      },
      {
        label: "Drafted",
        detail: "board-update.docx",
        tool: "Docs",
        state: "done" as const,
      },
      {
        label: "Waiting",
        detail: "Send to #exec",
        tool: "Slack",
        state: "waiting" as const,
      },
    ],
    approveLabel: "Approve & send",
    editLabel: "Edit first",
  },
  approval: {
    title: "Approval required",
    body: "Send a message in Slack · #exec. Review the draft, then allow once or edit.",
    draftPreview:
      "Q3 board update ready — three figures checked against last month.",
    sent: "Message queued for #exec.",
    editNote: "Draft opened for edit. Nothing was sent.",
  },
  progress: {
    title: "Progress",
    body: "For longer multi-step tasks, progress appears here while AnyWorker plans, uses tools, waits for approval, and produces artifacts.",
  },
  artifacts: {
    title: "Artifacts",
    empty: "No previewable files yet.",
    items: [
      { name: "board-update.docx", kind: "Docs" },
      { name: "Q3-figures.csv", kind: "Sheet" },
    ],
  },
  access: {
    title: "Access",
    items: [
      { name: "Browser", detail: "Allowed" },
      { name: "GitHub", detail: "1 folder" },
      { name: "Google Drive", detail: "Q3 folder" },
      { name: "Slack", detail: "#exec" },
    ],
  },
  composer: {
    placeholder: "Ask the coworker… (drop or paste files)",
    approvalMode: "Ask for approval",
    modelPicker: "AnyRouter · free",
  },
  home: {
    greeting: "Hello",
    greetingSub: "What should we finish today?",
    helper: "How can I help you today?",
    activeLabel: "Active",
    active: [
      { name: "Board update — Q3", when: "Running now" },
      { name: "Weekly marketing report", when: "Every Monday · 8:00" },
      { name: "Inbox triage", when: "2 days ago" },
    ],
  },
  automationsPanel: {
    title: "Automations",
    items: [
      {
        name: "Weekly marketing report",
        when: "Every Monday · 8:00",
        status: "On",
      },
      {
        name: "Slack mention triage",
        when: "On @AnyWorker",
        status: "On",
      },
      {
        name: "Month-end pack",
        when: "Last weekday · 17:00",
        status: "Off",
      },
    ],
  },
} as const

export const capabilities = {
  eyebrow: "Core capabilities",
  headline: [
    { text: "It doesn't just answer.", accent: false },
    { text: "It takes action.", accent: true },
  ],
  body: "Hand off a task the way you would to a colleague. AnyWorker works in the folders and tools you pick, and runs the job end to end.",
  items: [
    {
      icon: "PackageCheck",
      title: "Takes on the whole task",
      body: "It works directly in the folders and tools you choose and delivers finished work for review. Nothing to copy out of a chat or paste into a file.",
    },
    {
      icon: "Wand",
      title: "Say what, not how",
      body: "Describe the outcome you want. AnyWorker picks the steps, opens a browser when the job needs the web, and takes the screen only when it has to.",
    },
    {
      icon: "Eye",
      title: "See the work as it happens",
      body: "Every step is visible — the files it opens, the tools it uses, the calls it makes. Follow along from anywhere and redirect it mid-task.",
    },
    {
      icon: "Smartphone",
      title: "Your work follows you",
      body: "The same worker on web, desktop and mobile. Start a job at your desk, check it from your phone, pick it up on a laptop.",
    },
    {
      icon: "Moon",
      title: "Works when you don't",
      body: "Close the lid and it keeps going. Schedule a task on any cadence and it runs unattended, so the deck or the report is waiting when you come back.",
    },
    {
      icon: "Layers",
      title: "More than one thing at a time",
      body: "Big jobs split into chunks that run together. It researches while it drafts and organises while it checks, then hands back one polished result.",
    },
  ],
} as const

export const howItWorks = {
  eyebrow: "How it works",
  headline: [
    { text: "Three choices,", accent: false },
    { text: "then hand it over.", accent: true },
  ],
  body: "AnyWorker brings the model you pick to the tools your work already lives in, carries the task through, and returns the result in chat, in Slack, or as a finished file.",
  flow: {
    youAsk: "You ask",
    prompt: "What's the progress on Monday's launch?",
    workerName: "AnyWorker",
    workerSub: "runs on your machine or ours",
    modelBadge: "Any model",
    modelSub: "free · cloud · fully local",
    toolsLabel: "Your tools",
    outcomeLabel: "Finished outcome",
    outcomeSub: "Reply in chat or Slack",
    formats: "Docs · Sheets · Slides · PDF",
    backLabel: "Back to you",
    backSub: "in the form you need",
  },
  steps: [
    {
      title: "Choose a model",
      body: "Start on the free models included with AnyRouter. Switch to a cloud model or one running fully local on your own machine whenever you want. Nothing else changes.",
    },
    {
      title: "Connect your tools",
      body: "Pick the tools AnyWorker can reach — files, email, calendar, Slack, your CRM. One click for the common ones, manual setup for anything else.",
    },
    {
      title: "Delegate the outcome",
      body: "Ask for the brief, the report, the update or the action. AnyWorker does the work and checks in with you before anything is sent, shared or deleted.",
    },
  ],
} as const

export const skills = {
  eyebrow: "Out of the box",
  headline: [
    { text: "Ready for real work,", accent: false },
    { text: "not just chat.", accent: true },
  ],
  body: "AnyWorker ships ready for common kinds of work, with the right tools, working style and check-ins already set up. Pick a skill and hand off a task — no configuration, no prompt engineering.",
  items: [
    {
      icon: "Megaphone",
      title: "Marketing",
      body: "Tracks what's working — spend, attribution and the Monday report — without opening five dashboards.",
      worksWith: "Analytics · Slack · Docs",
      checksIn: "before anything is published",
    },
    {
      icon: "TrendingUp",
      title: "Sales",
      body: "Researches accounts, preps every meeting, and drafts follow-ups that sound like you rather than like a template.",
      worksWith: "CRM · Email · Calendar",
      checksIn: "before anything is sent",
    },
    {
      icon: "Scale",
      title: "Legal",
      body: "Reads the contract, flags the clauses that changed, and summarises the risk in language the rest of the team can act on.",
      worksWith: "Files · Email · Docs",
      checksIn: "before any position is shared",
    },
    {
      icon: "CalendarCheck",
      title: "Executive assistant",
      body: "Owns the calendar, triages the inbox, and keeps the day on rails so you only see what actually needs you.",
      worksWith: "Email · Calendar · Slack",
      checksIn: "before replying or moving meetings",
    },
    {
      icon: "Siren",
      title: "Ops on-call",
      body: "Triages the alert, digs through the runbook, and drafts the incident notes nobody wants to write at 3am.",
      worksWith: "Slack · Files · GitHub",
      checksIn: "before touching anything live",
    },
    {
      icon: "Receipt",
      title: "Finance",
      body: "Reconciles the sheet, chases the missing receipts, and builds the month-end pack from the numbers you already have.",
      worksWith: "Sheets · Email · Drive",
      checksIn: "before any figure goes out",
    },
  ],
  trigger: {
    eyebrow: "Works in the background",
    title: "Starts when work happens.",
    body: "Set a trigger once. AnyWorker starts the task on its own and checks in before important actions.",
    items: [
      {
        label: "Slack mention",
        title: "Triage the alert",
        body: "Check the runbook and draft an in-thread response.",
      },
      {
        label: "Incoming email",
        title: "Prepare the reply",
        body: "Gather the answers and hold the draft for review.",
      },
      {
        label: "Your schedule",
        title: "Deliver the report",
        body: "Pull the numbers and finish it before standup.",
      },
    ],
  },
} as const

export const connections = {
  eyebrow: "Works with what you choose",
  headline: [
    { text: "Your models.", accent: false },
    { text: "Your tools.", accent: true },
  ],
  body: "Run on the free models included, bring your own cloud provider, or keep everything on your machine. Then connect the everyday tools where your work already happens.",
  models: {
    label: "Model providers",
    sub: "Free, cloud, or fully local",
    items: [
      { name: "AnyRouter", logo: "anyrouter", status: "live", free: true },
      { name: "Anthropic", logo: "anthropic", status: "live" },
      { name: "OpenAI", logo: "openai", status: "live" },
      { name: "Gemini", logo: "gemini", status: "live" },
      { name: "DeepSeek", logo: "deepseek", status: "live", free: true },
      { name: "Qwen", logo: "qwen", status: "live", free: true },
      { name: "Z.AI · GLM", logo: "zai", status: "live", free: true },
      { name: "Kimi", logo: "kimi", status: "live", free: true },
      { name: "MiniMax", logo: "minimax", status: "live" },
      { name: "Mistral", logo: "mistral", status: "live" },
      { name: "xAI", logo: "xai", status: "live" },
      { name: "Ollama", logo: "ollama", status: "live" },
    ] satisfies Integration[],
  },
  tools: {
    label: "Everyday tools",
    sub: "One-click or manual connections",
    items: [
      { name: "Gmail", logo: "gmail", status: "live" },
      { name: "Google Calendar", logo: "gcal", status: "live" },
      { name: "Google Drive", logo: "gdrive", status: "live" },
      { name: "Slack", logo: "slack", status: "live" },
      { name: "Notion", logo: "notion", status: "live" },
      { name: "GitHub", logo: "github", status: "live" },
      { name: "Outlook", logo: "outlook", status: "soon" },
      { name: "Linear", logo: "linear", status: "soon" },
      { name: "Jira", logo: "jira", status: "soon" },
      { name: "HubSpot", logo: "hubspot", status: "soon" },
      { name: "Dropbox", logo: "dropbox", status: "soon" },
      { name: "Asana", logo: "asana", status: "soon" },
    ] satisfies Integration[],
  },
  footnote:
    "Anything with an MCP server connects too. Marked soon means it is on the roadmap, not shipped.",
} as const

export const anyrouter = {
  eyebrow: "The part nobody else gives you",
  headline: [
    { text: "Free models,", accent: false },
    { text: "built in.", accent: true },
  ],
  body: "Most AI workers ask for a credit card before they do anything. AnyWorker ships wired to AnyRouter's free tier, so the zero-cost path is the default path — not a crippled trial.",
  points: [
    {
      icon: "CreditCard",
      title: "No API key, no card",
      body: "Install it and delegate your first task. There is no key to create, no billing account to connect, no quota to request.",
    },
    {
      icon: "Repeat",
      title: "Switch models, keep everything",
      body: "Move from a free model to Claude, GPT or a local Ollama build with one setting. Your skills, connections and history come with you.",
    },
    {
      icon: "HardDrive",
      title: "Or run it entirely local",
      body: "Point AnyWorker at Ollama and nothing leaves your machine. Same skills, same connections, same worker.",
    },
  ],
  cta: { label: "See free models", href: "https://anyrouter.dev" },
} as const

export const plugins = {
  eyebrow: "Bring what you already built",
  headline: [
    { text: "Your Claude plugins", accent: false },
    { text: "just work.", accent: true },
  ],
  body: "AnyWorker reads the same plugin and skill format as Claude. Drop an existing plugin folder in and it loads — commands, skills, MCP servers and all. Nothing to port, nothing to rewrite.",
  items: [
    {
      icon: "Puzzle",
      title: "Plugins",
      body: "Existing Claude plugin bundles load unchanged.",
    },
    {
      icon: "BookOpen",
      title: "Skills",
      body: "Skill folders with frontmatter are picked up as-is.",
    },
    {
      icon: "Plug",
      title: "MCP servers",
      body: "Any MCP server you already run connects directly.",
    },
    {
      icon: "Terminal",
      title: "Slash commands",
      body: "Your custom commands come across with them.",
    },
  ],
} as const

export const control = {
  eyebrow: "You stay in charge",
  headline: [
    { text: "It checks in", accent: false },
    { text: "before it matters.", accent: true },
  ],
  body: "An agent that acts needs brakes. AnyWorker asks first on anything it cannot undo, and shows you exactly what it did on everything else.",
  items: [
    {
      icon: "ShieldCheck",
      title: "Approval before action",
      body: "Sending, publishing, paying, deleting — each one stops and waits for you. You choose which actions need a check and which run free.",
    },
    {
      icon: "ScrollText",
      title: "A readable trail",
      body: "Every file opened, tool called and decision made is logged in plain language. Scroll back through any task and see what actually happened.",
    },
    {
      icon: "Hand",
      title: "Stop it mid-task",
      body: "Redirect or halt a running job at any point. Work already done is kept, so you correct course instead of starting over.",
    },
    {
      icon: "Lock",
      title: "Scoped access",
      body: "It reaches only the folders and tools you grant, one at a time. Revoke any of it without touching the rest.",
    },
  ],
} as const

export const faq = {
  eyebrow: "Questions",
  headline: [{ text: "Before you start.", accent: true }],
  items: [
    {
      q: "Do I need to know how to code?",
      a: "No. Skills and connections are picked from a list, and you describe tasks in plain language. There is no terminal, no config file and no API key in the default setup.",
    },
    {
      q: "Is it really free?",
      a: "Yes. AnyWorker runs on AnyRouter's free models and includes every built-in skill, with no card and no API key. If you would rather use a paid model, bring your own key and it costs whatever that provider charges.",
    },
    {
      q: "How is this different from a chatbot?",
      a: "A chatbot returns text you then act on. AnyWorker acts: it opens the file, edits the sheet, drafts the email and sends it once you approve. You get finished work, not instructions.",
    },
    {
      q: "What stops it doing something I didn't want?",
      a: "It asks before anything irreversible — sending, publishing, paying, deleting — and it only reaches the folders and tools you have granted. Every step is logged, and you can stop a task mid-run.",
    },
    {
      q: "Can I use my existing Claude plugins?",
      a: "Yes. AnyWorker reads the same plugin and skill format, including MCP servers and slash commands. Point it at your plugin folder and it loads them unchanged.",
    },
    {
      q: "Can I keep my data on my own machine?",
      a: "Yes. Point it at a local model through Ollama and nothing leaves your machine. The skills and connections work the same way.",
    },
  ],
} as const

export const finalCta = {
  headline: [
    { text: "Stop describing the work.", accent: false },
    { text: "Hand it over.", accent: true },
  ],
  body: "Install AnyWorker, pick a skill, and give it something off your list today.",
  primaryCta: { label: "Start free", href: "#get-started" },
  secondaryCta: { label: "Read the docs", href: "https://anyrouter.dev" },
  note: "Free models included. No card, no API key.",
} as const

export const footer = {
  blurb: "An open AI coworker for people who don't code.",
  columns: [
    {
      title: "Product",
      links: [
        { label: "How it works", href: "#how-it-works" },
        { label: "Skills", href: "#skills" },
        { label: "Connections", href: "#connections" },
        { label: "Free models", href: "#free-models" },
      ],
    },
    {
      title: "Build",
      links: [
        { label: "Docs", href: "https://anyrouter.dev" },
        { label: "Free models", href: "https://anyrouter.dev" },
        { label: "Plugins", href: "#plugins" },
        { label: "MCP servers", href: "#plugins" },
      ],
    },
    {
      title: "Design variants",
      links: [
        { label: "Clarity", href: "/" },
        { label: "Studio", href: "/d/studio" },
        { label: "Paper", href: "/d/paper" },
        { label: "Compare all", href: "/d" },
      ],
    },
  ],
  legal: "Early access. Feature availability changes week to week.",
} as const

/** The three design directions, used by the /d picker and the route files. */
export const variants = [
  {
    id: "clarity",
    name: "Clarity",
    href: "/",
    summary:
      "Pure white, black CTAs, painted stage. Cursor-style product windows.",
    notes: "The chosen direction — this is what ships at anyworker.dev.",
  },
  {
    id: "studio",
    name: "Studio",
    href: "/d/studio",
    summary:
      "Near-black canvas, white CTAs. x.ai-style dark product chrome.",
    notes: "Dark alternate at /d/studio.",
  },
  {
    id: "paper",
    name: "Paper",
    href: "/d/paper",
    summary:
      "Warm cream, clay accent, Fraunces. Editorial light variant.",
    notes: "Kept for comparison at /d/paper.",
  },
] as const

export type ThemeId = (typeof variants)[number]["id"]
