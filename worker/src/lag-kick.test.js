import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LAG_ALARM_KICK_CRONS,
  LAG_ALARM_REF,
  LAG_ALARM_WORKFLOW,
  githubApiHeaders,
  hasActiveLagAlarmRun,
  isLagAlarmKickCron,
  kickLagAlarmWorkflow,
  workflowDispatchUrl,
  workflowRunsUrl,
} from "./lag-kick.js";

describe("isLagAlarmKickCron", () => {
  it("matches the 10/25/40 lag alarm kick crons", () => {
    assert.deepEqual(LAG_ALARM_KICK_CRONS, ["10 * * * *", "25 * * * *", "40 * * * *"]);
    assert.equal(isLagAlarmKickCron("10 * * * *"), true);
    assert.equal(isLagAlarmKickCron("25 * * * *"), true);
    assert.equal(isLagAlarmKickCron("40 * * * *"), true);
  });

  it("does not match the cache-warm cron or Actions lag minutes", () => {
    assert.equal(isLagAlarmKickCron("*/5 * * * *"), false);
    assert.equal(isLagAlarmKickCron("7,22,37,52 * * * *"), false);
    assert.equal(isLagAlarmKickCron(""), false);
    assert.equal(isLagAlarmKickCron(undefined), false);
  });
});

describe("GitHub URLs and headers", () => {
  it("targets this repo's lag-alarm workflow_dispatch on main", () => {
    assert.equal(
      workflowDispatchUrl(),
      "https://api.github.com/repos/EliseoCab/brownsville-wait-times/actions/workflows/check-data-freshness.yml/dispatches"
    );
    assert.match(workflowRunsUrl(), /check-data-freshness\.yml\/runs\?per_page=5$/);
    assert.equal(LAG_ALARM_WORKFLOW, "check-data-freshness.yml");
    assert.equal(LAG_ALARM_REF, "main");
  });

  it("sends GitHub REST headers without leaking a dummy token into the URL", () => {
    const headers = githubApiHeaders("test-token");
    assert.equal(headers.Accept, "application/vnd.github+json");
    assert.equal(headers.Authorization, "Bearer test-token");
    assert.equal(headers["X-GitHub-Api-Version"], "2022-11-28");
    assert.ok(!workflowDispatchUrl().includes("test-token"));
  });
});

describe("hasActiveLagAlarmRun", () => {
  it("is true when a run is queued or in progress", () => {
    assert.equal(
      hasActiveLagAlarmRun({
        workflow_runs: [{ status: "completed" }, { status: "in_progress" }],
      }),
      true
    );
    assert.equal(
      hasActiveLagAlarmRun({ workflow_runs: [{ status: "queued" }] }),
      true
    );
  });

  it("is false when nothing is active", () => {
    assert.equal(hasActiveLagAlarmRun({ workflow_runs: [{ status: "completed" }] }), false);
    assert.equal(hasActiveLagAlarmRun({ workflow_runs: [] }), false);
    assert.equal(hasActiveLagAlarmRun(null), false);
  });
});

describe("kickLagAlarmWorkflow", () => {
  it("skips when GITHUB_DISPATCH_TOKEN is missing", async () => {
    const calls = [];
    const result = await kickLagAlarmWorkflow({}, (url, opts) => {
      calls.push({ url, opts });
      throw new Error("fetch should not run");
    });
    assert.deepEqual(result, { ok: true, skipped: true, reason: "missing-token" });
    assert.equal(calls.length, 0);
  });

  it("skips dispatch when a lag-alarm run is already active", async () => {
    const calls = [];
    const result = await kickLagAlarmWorkflow(
      { GITHUB_DISPATCH_TOKEN: "pat" },
      async (url) => {
        calls.push(url);
        return {
          ok: true,
          status: 200,
          json: async () => ({ workflow_runs: [{ status: "queued" }] }),
        };
      }
    );
    assert.deepEqual(result, { ok: true, skipped: true, reason: "already-running" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0], workflowRunsUrl());
  });

  it("POSTs workflow_dispatch with ref main after a quiet runs list", async () => {
    const calls = [];
    const result = await kickLagAlarmWorkflow(
      { GITHUB_DISPATCH_TOKEN: "pat" },
      async (url, opts) => {
        calls.push({ url, opts });
        if (String(url).includes("/runs")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ workflow_runs: [{ status: "completed" }] }),
          };
        }
        return { ok: false, status: 204, text: async () => "" };
      }
    );
    assert.deepEqual(result, { ok: true, skipped: false, status: 204 });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, workflowDispatchUrl());
    assert.equal(calls[1].opts.method, "POST");
    assert.equal(calls[1].opts.body, JSON.stringify({ ref: "main" }));
    assert.equal(calls[1].opts.headers.Authorization, "Bearer pat");
  });

  it("still dispatches if listing runs fails", async () => {
    const methods = [];
    const result = await kickLagAlarmWorkflow(
      { GITHUB_DISPATCH_TOKEN: "pat" },
      async (url, opts) => {
        methods.push(opts.method);
        if (opts.method === "GET") throw new Error("list failed");
        return { ok: true, status: 204, text: async () => "" };
      }
    );
    assert.equal(result.ok, true);
    assert.equal(result.skipped, false);
    assert.deepEqual(methods, ["GET", "POST"]);
  });

  it("returns the GitHub error body when dispatch is rejected", async () => {
    const result = await kickLagAlarmWorkflow(
      { GITHUB_DISPATCH_TOKEN: "pat" },
      async (url, opts) => {
        if (opts.method === "GET") {
          return { ok: false, status: 401, json: async () => ({}) };
        }
        return { ok: false, status: 403, text: async () => "Resource not accessible by personal access token" };
      }
    );
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
    assert.match(result.error, /personal access token/);
  });
});
