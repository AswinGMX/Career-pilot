import assert = require("node:assert");
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { LocalStorageDriver } from "../src/storage/local-storage.driver";

/** Round-trips the local storage driver and validates signed-URL semantics. */
async function main(): Promise<void> {
  const rootDir = mkdtempSync(join(tmpdir(), "cp-storage-"));
  const driver = new LocalStorageDriver({
    rootDir,
    publicBaseUrl: "http://127.0.0.1:4000/v1",
    signingSecret: "test-secret",
    defaultExpiresInSeconds: 60
  });

  const key = "reports/student/test-123.json";
  const payload = JSON.stringify({ hello: "career-pilot" });

  await driver.putObject({ key, body: payload, contentType: "application/json" });
  assert.strictEqual(await driver.exists(key), true, "object should exist after put");
  assert.strictEqual((await driver.getObject(key)).toString(), payload, "round-trip body mismatch");

  const download = await driver.createSignedDownload(key);
  const url = new URL(download.url);
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") ?? "";
  assert.strictEqual(url.searchParams.get("key"), key, "signed url should carry key");
  assert.strictEqual(driver.verify(key, exp, "GET", sig), true, "valid signature should verify");
  assert.strictEqual(driver.verify(key, exp, "GET", "tampered"), false, "tampered signature must fail");
  assert.strictEqual(driver.verify(key, Math.floor(Date.now() / 1000) - 10, "GET", sig), false, "expired url must fail");

  let traversalBlocked = false;
  try {
    await driver.getObject("../../etc/passwd");
  } catch {
    traversalBlocked = true;
  }
  assert.strictEqual(traversalBlocked, true, "path traversal must be blocked");

  await driver.deleteObject(key);
  assert.strictEqual(await driver.exists(key), false, "object should be gone after delete");

  console.log("[storage-smoke] PASS — local driver round-trip, signed URLs, and traversal guard all hold.");
  process.exit(0);
}

main().catch((error) => {
  console.error(`[storage-smoke] FAIL — ${(error as Error)?.message ?? error}`);
  process.exit(1);
});
