import assert from "node:assert/strict";
import { test } from "node:test";
import { autoUpdateDisabled, registerUpdaterIpc } from "./updater.mjs";

// A local or fork build runs from a packaged bundle, so app.isPackaged alone
// cannot keep it off the upstream release feeds. OPENWORK_DISABLE_AUTO_UPDATE
// must stop the updater before electron-updater is even loaded.

function register(env) {
  let loads = 0;
  const { ensureAutoUpdater } = registerUpdaterIpc({
    app: /** @type {any} */ ({ isPackaged: true, getVersion: () => "0.0.0-dev", getPath: () => "/nonexistent", getName: () => "OpenWork" }),
    ipcMain: /** @type {any} */ ({ handle: () => {}, on: () => {} }),
    getMainWindow: () => null,
    // A stand-in for electron-updater: only whether it is loaded matters here.
    loadAutoUpdater: /** @type {any} */ (async () => {
      loads += 1;
      return { autoUpdater: null };
    }),
    env,
  });
  return { ensureAutoUpdater, loads: () => loads };
}

test("only an explicit 1 disables updates", () => {
  assert.equal(autoUpdateDisabled({ OPENWORK_DISABLE_AUTO_UPDATE: "1" }), true);
  assert.equal(autoUpdateDisabled({ OPENWORK_DISABLE_AUTO_UPDATE: " 1 " }), true);
  for (const value of [undefined, "", "0", "true", "yes"]) {
    assert.equal(autoUpdateDisabled({ OPENWORK_DISABLE_AUTO_UPDATE: value }), false, `value ${JSON.stringify(value)}`);
  }
});

test("a disabled packaged build never loads the updater", async () => {
  const subject = register({ OPENWORK_DISABLE_AUTO_UPDATE: "1" });
  assert.equal(await subject.ensureAutoUpdater(), null);
  assert.equal(subject.loads(), 0);
});

test("an enabled packaged build still loads it", async () => {
  const subject = register({});
  await subject.ensureAutoUpdater();
  assert.equal(subject.loads(), 1);
});
