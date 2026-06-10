import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

import handler from "../server.js";
import {
  buildStorageFileName,
  coerceTimestampToMs,
  escapeCssSelectorToken,
  escapeHtml,
  formatBytes,
  getFileExtension,
  inferNameFromEmail,
  isValidRouteId,
  normalizeDisplayName,
  normalizeMediaDisplayName,
  normalizePersonName,
  normalizeRouteId,
  sanitizeFileBaseName,
  sanitizeUpper,
  simplifyMimeType,
  slugifyFolder,
  slugifyTrip,
} from "../static/modules/core/utils.js";

const readText = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("core utility module preserves app-facing behavior", () => {
  assert.equal(normalizeDisplayName("  Eric   Tatch  "), "Eric Tatch");
  assert.equal(normalizePersonName("  ERIC   TATCH  "), "ERIC TATCH");
  assert.equal(normalizeRouteId("e.t.7"), "ET7");
  assert.equal(normalizeRouteId("ab"), "");
  assert.equal(isValidRouteId("ABC"), true);
  assert.equal(isValidRouteId("AB"), false);
  assert.equal(normalizeMediaDisplayName("clip name", "source.MP4"), "clip name.mp4");
  assert.equal(sanitizeFileBaseName("My Clip 01.MP4"), "my-clip-01");
  assert.equal(getFileExtension("My Clip.MP4"), "mp4");
  assert.equal(simplifyMimeType("video/mp4"), "mp4");
  assert.equal(slugifyTrip("Montreal 2025!"), "mtl-2025");
  assert.equal(slugifyFolder("Day One!"), "day-one");
  assert.equal(sanitizeUpper("  file system ready "), "FILE SYSTEM READY");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(coerceTimestampToMs({ toMillis: () => 123 }), 123);
  assert.equal(escapeHtml(`<img alt="x">`), "&lt;img alt=&quot;x&quot;&gt;");
  assert.equal(inferNameFromEmail("eric.tatch@example.com"), "Eric Tatch");
  assert.equal(escapeCssSelectorToken(`a"b\\c`), `a\\"b\\\\c`);
});

test("storage filename helper keeps extension and safe base", () => {
  const originalNow = Date.now;
  const originalRandom = Math.random;
  Date.now = () => 1700000000000;
  Math.random = () => 0.123456789;

  try {
    assert.match(
      buildStorageFileName({ name: "Source Clip.MP4" }, 7, "Final Cut"),
      /^17000000000000007-[a-z0-9]{6}-final-cut\.mp4$/
    );
  } finally {
    Date.now = originalNow;
    Math.random = originalRandom;
  }
});

test("app source imports the extracted core utility module", async () => {
  const appSource = await readText("static/app.js");
  const html = await readText("index.html");

  assert.match(html, /<script type="module" src="\/static\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /src="\/app\.js"/);
  assert.match(appSource, /from "\.\/modules\/core\/utils\.js"/);

  for (const functionName of [
    "escapeHtml",
    "formatBytes",
    "slugifyTrip",
    "slugifyFolder",
    "coerceTimestampToMs",
  ]) {
    assert.doesNotMatch(
      appSource,
      new RegExp(`function\\s+${functionName}\\s*\\(`),
      `${functionName} should live in static/modules/core/utils.js`
    );
  }
});

test("HTML still provides every hard DOM id app.js requests", async () => {
  const [html, appSource] = await Promise.all([
    readText("index.html"),
    readText("static/app.js"),
  ]);
  const optionalLegacyIds = new Set([
    // These hooks are optional in the current HTML shell and remain guarded by optional chaining.
    "friends-mobile-count",
    "friends-mobile-list",
    "friends-mobile-panel",
    "friends-mobile-status",
    "friends-mobile-title",
    "profile-current-image-label",
    "text-folder-select",
    "text-trip-select",
    "upload-folder-select",
    "upload-trip-select",
    "video-preview-social-summary",
  ]);
  const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const requestedIds = [
    ...new Set(
      [...appSource.matchAll(/document\.getElementById\("([^"]+)"\)/g)].map((match) => match[1])
    ),
  ].sort();
  const missingIds = requestedIds.filter((id) => !htmlIds.has(id) && !optionalLegacyIds.has(id));

  assert.deepEqual(missingIds, []);
});

test("critical delegated actions remain present in rendered/static source", async () => {
  const [html, appSource] = await Promise.all([
    readText("index.html"),
    readText("static/app.js"),
  ]);
  const source = `${html}\n${appSource}`;

  for (const action of [
    "preview-media",
    "preview-media-card",
    "preview-text",
    "toggle-social-like",
    "open-thread",
    "select-folder",
    "sort-items",
    "open-contribute",
    "set-contribute-mode",
    "show-contribute-menu",
    "role-select",
  ]) {
    assert.match(source, new RegExp(`data-action=["']${action}["']`), `${action} should be rendered`);
  }
});

test("server smoke: SPA routes and static modules are served", async (t) => {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const vaultStatus = await fetch(`${baseUrl}/api/vault/status`);
  assert.equal(vaultStatus.status, 200);
  assert.equal((await vaultStatus.json()).unlocked, false);

  const config = await fetch(`${baseUrl}/api/config`);
  assert.equal(config.status, 403);

  const feed = await fetch(`${baseUrl}/feed`);
  assert.equal(feed.status, 200);
  assert.match(await feed.text(), /<section id="feed-page"/);

  const app = await fetch(`${baseUrl}/static/app.js`);
  assert.equal(app.status, 200);
  assert.match(app.headers.get("content-type") || "", /javascript/);

  const module = await fetch(`${baseUrl}/static/modules/core/utils.js`);
  assert.equal(module.status, 200);
  assert.match(await module.text(), /export function escapeHtml/);
});
