import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { createWorkspaceStore } from "./workspace-store.mjs";
import { sanitizeDesktopBootstrapConfig } from "./nuke.mjs";

// disableCloud is a local display preference in desktop-bootstrap.json. The
// file is rewritten by the app on sign-in, connect links and control-plane URL
// changes, none of which know about it, so the property worth pinning is that
// it survives those rewrites, not just that it parses.

let dir;
let bootstrapPath;
let previousEnv;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "openwork-disable-cloud-"));
  bootstrapPath = path.join(dir, "desktop-bootstrap.json");
  previousEnv = process.env.OPENWORK_DESKTOP_BOOTSTRAP_PATH;
  process.env.OPENWORK_DESKTOP_BOOTSTRAP_PATH = bootstrapPath;
});

afterEach(async () => {
  if (previousEnv === undefined) delete process.env.OPENWORK_DESKTOP_BOOTSTRAP_PATH;
  else process.env.OPENWORK_DESKTOP_BOOTSTRAP_PATH = previousEnv;
  await rm(dir, { recursive: true, force: true });
});

function store() {
  return createWorkspaceStore({
    app: { getPath: () => dir },
    defaultDenBaseUrl: "https://app.openworklabs.com",
    defaultRequireSignin: false,
    forceRequireSignin: false,
  });
}

async function writeBootstrap(value) {
  await writeFile(bootstrapPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readBootstrapFile() {
  return JSON.parse(await readFile(bootstrapPath, "utf8"));
}

test("a hand-written disableCloud: true is read from the file", async () => {
  await writeBootstrap({ baseUrl: "https://app.openworklabs.com", disableCloud: true });
  const config = await store().getDesktopBootstrapConfig();
  assert.equal(config.fromFile, true);
  assert.equal(config.disableCloud, true);
  assert.equal(store().readDesktopBootstrapConfigSync().disableCloud, true);
});

test("an absent or non-true value carries no key, keeping today's behaviour", async () => {
  for (const value of [undefined, false, "true", 1]) {
    await writeBootstrap({ baseUrl: "https://app.openworklabs.com", disableCloud: value });
    const config = await store().getDesktopBootstrapConfig();
    assert.equal("disableCloud" in config, false, `value ${JSON.stringify(value)}`);
  }
});

test("disableCloud never relaxes requireSignin", async () => {
  await writeBootstrap({ baseUrl: "https://app.openworklabs.com", requireSignin: true, disableCloud: true });
  const config = await store().getDesktopBootstrapConfig();
  assert.equal(config.requireSignin, true);
  assert.equal(config.disableCloud, true);
});

test("a rewrite that does not mention it keeps the value on disk", async () => {
  await writeBootstrap({ baseUrl: "https://app.openworklabs.com", disableCloud: true });
  // What the renderer sends after a sign-in or a control-plane URL change.
  await store().setDesktopBootstrapConfig({ baseUrl: "https://den.example.test", requireSignin: false });
  const written = await readBootstrapFile();
  assert.equal(written.baseUrl, "https://den.example.test");
  assert.equal(written.disableCloud, true);
});

test("an explicit false in a rewrite clears it", async () => {
  await writeBootstrap({ baseUrl: "https://app.openworklabs.com", disableCloud: true });
  await store().setDesktopBootstrapConfig({
    baseUrl: "https://app.openworklabs.com",
    requireSignin: false,
    disableCloud: false,
  });
  assert.equal("disableCloud" in (await readBootstrapFile()), false);
});

test("a rewrite with no file on disk does not invent the key", async () => {
  await store().setDesktopBootstrapConfig({ baseUrl: "https://app.openworklabs.com", requireSignin: false });
  assert.equal("disableCloud" in (await readBootstrapFile()), false);
});

test("a fresh-start reset keeps it, like branding", () => {
  const kept = sanitizeDesktopBootstrapConfig({
    baseUrl: "https://app.openworklabs.com",
    disableCloud: true,
    handoff: { grant: "x" },
  });
  assert.equal(kept.disableCloud, true);
  assert.equal("handoff" in kept, false);
  const plain = sanitizeDesktopBootstrapConfig({ baseUrl: "https://app.openworklabs.com" });
  assert.equal("disableCloud" in plain, false);
});
