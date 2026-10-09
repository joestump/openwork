/** @jsxImportSource react */
import { createContext, useCallback, use, useEffect, useMemo, useState, type ReactNode } from "react";

import { readDenBootstrapConfig, type DenBootstrapConfig } from "@/app/lib/den";
import { denSettingsChangedEvent } from "@/app/lib/den-session-events";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ShellConfig = {
  /** Display name shown in the title bar, sidebar, and welcome page. */
  appName: string;
  /** Show live connection status inside the sidebar account menu. */
  statusBar: boolean;
  /** Show the left sidebar with workspace/session list. */
  sidebar: boolean;
  /** Show the Docs entry in the account menu. */
  docsButton: boolean;
  /** Show the Feedback entry in the account menu. */
  feedbackButton: boolean;
  /** Show the Cloud sign-in button when not signed in. */
  cloudSignin: boolean;
  /**
   * Show surfaces that only work with an OpenWork Cloud account: Dashboard,
   * Automations, saved apps, the Account and Usage settings, organization
   * providers, cloud Library previews, and every sign-in upsell. Off means
   * this install does not use OpenWork Cloud at all.
   */
  cloudFeatures: boolean;
  /** Show the welcome/onboarding page for new users. */
  welcomePage: boolean;
  /** Show starter task cards in empty sessions. */
  starterCards: boolean;
  /** Show the model picker / model change UI. */
  modelPicker: boolean;
  /** Show the built-in browser panel. */
  browser: boolean;
  /** Show the "Add workspace" button. */
  addWorkspace: boolean;
  /** Show the notification bell in the header. */
  notifications: boolean;
};

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

export const DEFAULT_SHELL_CONFIG: ShellConfig = {
  appName: "OpenWork",
  statusBar: true,
  sidebar: true,
  docsButton: true,
  feedbackButton: true,
  cloudSignin: true,
  cloudFeatures: true,
  welcomePage: true,
  starterCards: true,
  modelPicker: true,
  browser: true,
  addWorkspace: true,
  notifications: true,
};

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "openwork.shell-config";

function readShellConfig(): ShellConfig {
  if (typeof window === "undefined") return DEFAULT_SHELL_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHELL_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SHELL_CONFIG, ...parsed };
  } catch {
    return DEFAULT_SHELL_CONFIG;
  }
}

function writeShellConfig(config: ShellConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors.
  }
}

/**
 * The config the shell actually renders: the stored (localStorage) config with
 * install-level policy from desktop-bootstrap.json applied on top. Bootstrap
 * policy only ever hides: `disableCloud: true` means the install does not
 * use OpenWork Cloud, so it forces off the sign-in prompts (`cloudSignin`),
 * every surface that needs a Cloud account (`cloudFeatures`), and the activity
 * bell, whose only writer is the Cloud member-activity sync. An absent key
 * leaves the stored value alone. The stored config is never rewritten with it,
 * so removing the key from the file restores everything.
 */
export function resolveShellConfig(
  stored: ShellConfig,
  bootstrap: Pick<DenBootstrapConfig, "disableCloud">,
): ShellConfig {
  if (bootstrap.disableCloud !== true) return stored;
  return { ...stored, cloudSignin: false, cloudFeatures: false, notifications: false };
}

function readBootstrapDisablesCloud(): boolean {
  try {
    return readDenBootstrapConfig().disableCloud === true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type ShellConfigContextValue = {
  config: ShellConfig;
  update: (patch: Partial<ShellConfig>) => void;
  reset: () => void;
};

const ShellConfigContext = createContext<ShellConfigContextValue | undefined>(undefined);

export function ShellConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ShellConfig>(readShellConfig);
  const [disableCloud, setDisableCloud] = useState(readBootstrapDisablesCloud);

  // The bootstrap can change under a running app (a re-read after the shell
  // persists a new config dispatches this event), so follow it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setDisableCloud(readBootstrapDisablesCloud());
    window.addEventListener(denSettingsChangedEvent, sync);
    return () => window.removeEventListener(denSettingsChangedEvent, sync);
  }, []);

  const update = useCallback((patch: Partial<ShellConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      writeShellConfig(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setConfig(DEFAULT_SHELL_CONFIG);
    writeShellConfig(DEFAULT_SHELL_CONFIG);
  }, []);

  const value = useMemo<ShellConfigContextValue>(
    () => ({ config: resolveShellConfig(config, { disableCloud }), update, reset }),
    [config, disableCloud, update, reset],
  );

  return (
    <ShellConfigContext.Provider value={value}>
      {children}
    </ShellConfigContext.Provider>
  );
}

export function useShellConfig(): ShellConfigContextValue {
  const ctx = use(ShellConfigContext);
  if (!ctx) {
    throw new Error("useShellConfig must be used within a ShellConfigProvider");
  }
  return ctx;
}
