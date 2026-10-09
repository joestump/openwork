export const ADVANCED_SETTINGS_SECTIONS = [
  { id: "organization-server", title: "Organization server", keywords: ["den", "control plane", "server url", "reset server"] },
  { id: "runtime", title: "Runtime", keywords: ["opencode engine", "openwork server", "connection status"] },
  { id: "agent-access", title: "Agent access diagnostics", keywords: ["cloud mcp", "health", "tools", "connections"] },
  { id: "config-sources", title: "OpenCode config sources", keywords: ["runtime db", "injected config", "project config", "global config"] },
  { id: "experimental-engine", title: "Experimental engine", keywords: ["engine v2", "chat engine", "preview"] },
  { id: "workspace-run-mode", title: "Workspace run mode", keywords: ["approvals", "permissions", "keep going", "feature flag"] },
  { id: "developer", title: "Developer", keywords: ["developer mode", "debug", "deep link"] },
];

/**
 * Advanced sections that configure or diagnose OpenWork Cloud. An install that
 * does not use Cloud (shellConfig.cloudFeatures off) hides them.
 */
export const CLOUD_ONLY_ADVANCED_SECTION_IDS: ReadonlySet<string> = new Set(["organization-server", "agent-access"]);
