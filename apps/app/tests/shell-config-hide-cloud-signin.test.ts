import { describe, expect, test } from "bun:test";
import { DEFAULT_SHELL_CONFIG, resolveShellConfig } from "../src/react-app/shell/shell-config";

// desktop-bootstrap.json `hideCloudSignin: true` turns off every surface that
// reads shellConfig.cloudSignin: the session header button, the sidebar account
// row's sign-in prompt, and the OpenWork Models promo. It only ever hides.

describe("resolveShellConfig", () => {
  test("hideCloudSignin: true forces cloudSignin off", () => {
    const resolved = resolveShellConfig(DEFAULT_SHELL_CONFIG, { hideCloudSignin: true });
    expect(resolved.cloudSignin).toBe(false);
    // Nothing else moves.
    expect({ ...resolved, cloudSignin: true }).toEqual(DEFAULT_SHELL_CONFIG);
  });

  test("an absent key leaves the stored config untouched", () => {
    expect(resolveShellConfig(DEFAULT_SHELL_CONFIG, {})).toBe(DEFAULT_SHELL_CONFIG);
    expect(resolveShellConfig(DEFAULT_SHELL_CONFIG, { hideCloudSignin: undefined })).toBe(DEFAULT_SHELL_CONFIG);
  });

  test("bootstrap policy never re-enables a prompt the stored config turned off", () => {
    const stored = { ...DEFAULT_SHELL_CONFIG, cloudSignin: false };
    expect(resolveShellConfig(stored, {}).cloudSignin).toBe(false);
  });

  test("the stored config object is not mutated", () => {
    const stored = { ...DEFAULT_SHELL_CONFIG };
    resolveShellConfig(stored, { hideCloudSignin: true });
    expect(stored.cloudSignin).toBe(true);
  });
});
