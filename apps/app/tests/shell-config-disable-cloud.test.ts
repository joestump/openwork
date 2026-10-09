import { describe, expect, test } from "bun:test";
import {
  CLOUD_ONLY_SETTINGS_TABS,
  isSettingsTabAllowed,
  settingsTabFallback,
} from "../src/app/cloud/desktop-app-restrictions";
import { aiProvidersDescription } from "../src/react-app/domains/settings/pages/ai-view";
import { buildCommandPaletteSettingsItems } from "../src/react-app/shell/command-palette-settings";
import { DEFAULT_SHELL_CONFIG, resolveShellConfig } from "../src/react-app/shell/shell-config";

// desktop-bootstrap.json `disableCloud: true` means the install does not use
// OpenWork Cloud. It folds into shellConfig as cloudSignin, cloudFeatures and
// notifications all off, and every Cloud-only surface reads one of those.

describe("resolveShellConfig", () => {
  test("disableCloud: true turns off sign-in, Cloud features and the activity bell", () => {
    const resolved = resolveShellConfig(DEFAULT_SHELL_CONFIG, { disableCloud: true });
    expect(resolved.cloudSignin).toBe(false);
    expect(resolved.cloudFeatures).toBe(false);
    expect(resolved.notifications).toBe(false);
    // Nothing else moves.
    expect({ ...resolved, cloudSignin: true, cloudFeatures: true, notifications: true }).toEqual(DEFAULT_SHELL_CONFIG);
  });

  test("an absent key leaves the stored config untouched", () => {
    expect(resolveShellConfig(DEFAULT_SHELL_CONFIG, {})).toBe(DEFAULT_SHELL_CONFIG);
    expect(resolveShellConfig(DEFAULT_SHELL_CONFIG, { disableCloud: undefined })).toBe(DEFAULT_SHELL_CONFIG);
  });

  test("bootstrap policy never re-enables something the stored config turned off", () => {
    const stored = { ...DEFAULT_SHELL_CONFIG, cloudSignin: false, notifications: false };
    const resolved = resolveShellConfig(stored, {});
    expect(resolved.cloudSignin).toBe(false);
    expect(resolved.notifications).toBe(false);
  });

  test("the stored config object is not mutated", () => {
    const stored = { ...DEFAULT_SHELL_CONFIG };
    resolveShellConfig(stored, { disableCloud: true });
    expect(stored).toEqual(DEFAULT_SHELL_CONFIG);
  });

  test("Cloud features default on", () => {
    expect(DEFAULT_SHELL_CONFIG.cloudFeatures).toBe(true);
  });
});

const noPolicy = () => false;
const allPolicies = () => true;

describe("settings tabs without OpenWork Cloud", () => {
  test("Account, Usage and Cloud providers are hidden; everything else stays", () => {
    expect([...CLOUD_ONLY_SETTINGS_TABS].sort()).toEqual(["cloud-account", "cloud-providers", "usage"]);
    for (const tab of CLOUD_ONLY_SETTINGS_TABS) {
      expect(isSettingsTabAllowed({ tab, checkRestriction: noPolicy, cloudFeatures: false })).toBe(false);
      expect(isSettingsTabAllowed({ tab, checkRestriction: noPolicy })).toBe(true);
    }
    for (const tab of ["general", "ai", "extensions", "advanced", "appearance"] as const) {
      expect(isSettingsTabAllowed({ tab, checkRestriction: noPolicy, cloudFeatures: false })).toBe(true);
    }
  });

  test("a blocked tab falls back to General, which is always reachable (no redirect loop)", () => {
    expect(settingsTabFallback(false)).toBe("general");
    expect(settingsTabFallback(true)).toBe("cloud-account");
    expect(settingsTabFallback()).toBe("cloud-account");
    // Even with a lingering allowControlSettings policy that blocks everything
    // but the Cloud tabs, the fallback must stay allowed.
    expect(isSettingsTabAllowed({ tab: "general", checkRestriction: allPolicies, cloudFeatures: false })).toBe(true);
    // Upstream behaviour with Cloud on is unchanged.
    expect(isSettingsTabAllowed({ tab: "general", checkRestriction: allPolicies })).toBe(false);
    expect(isSettingsTabAllowed({ tab: "cloud-account", checkRestriction: allPolicies })).toBe(true);
  });
});

describe("command palette settings items without OpenWork Cloud", () => {
  const build = (cloudFeatures?: boolean) => buildCommandPaletteSettingsItems({
    developerMode: false,
    capabilities: { autoUpdate: false },
    cloudFeatures,
    onOpenSettings: () => {},
    onOpenExtensions: () => {},
  }).map((item) => item.id);

  test("Cloud tabs, Library › Connections and the Cloud Advanced sections are dropped", () => {
    const on = build();
    const off = build(false);
    for (const id of [
      "settings:cloud-account",
      "settings:usage",
      "settings:extensions/connections",
      "settings:advanced/organization-server",
      "settings:advanced/agent-access",
    ]) {
      expect(on).toContain(id);
      expect(off).not.toContain(id);
    }
    // Local items survive.
    for (const id of ["settings:ai", "settings:extensions/mcps", "settings:extensions/skills", "settings:advanced/runtime"]) {
      expect(off).toContain(id);
    }
  });
});

describe("AI providers description", () => {
  test("drops the organization sign-in pitch without Cloud", () => {
    const off = aiProvidersDescription({ signedIn: false, cloudFeatures: false });
    expect(off).not.toContain("Sign in");
    expect(off).not.toContain("organization");
    expect(aiProvidersDescription({ signedIn: false })).toContain("Sign in");
  });
});
