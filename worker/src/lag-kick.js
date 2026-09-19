/**
 * Backup kick for Check data freshness (lag alarm).
 *
 * GitHub Actions cron (10,25,40,55) + Worker kicks at same times provide redundancy.
 * The Worker posts workflow_dispatch at :10/:25/:40/:55 UTC (aligned with Actions) so
 * B&M / Gateway Update Pending still gets checked.
 *
 * Secret: GITHUB_DISPATCH_TOKEN (never commit a token).
 */

export const LAG_ALARM_KICK_CRONS = ["10 * * * *", "25 * * * *", "40 * * * *", "55 * * * *"];
export const GITHUB_OWNER = "EliseoCab";
export const GITHUB_REPO = "brownsville-wait-times";
export const LAG_ALARM_WORKFLOW = "check-data-freshness.yml";
export const LAG_ALARM_REF = "main";

const ACTIVE_RUN_STATUSES = {
  queued: true,
  in_progress: true,
  waiting: true,
  pending: true,
  requested: true,
};

export function isLagAlarmKickCron(cron) {
  return LAG_ALARM_KICK_CRONS.indexOf(String(cron || "")) !== -1;
}

export function workflowDispatchUrl() {
  return (
    "https://api.github.com/repos/" +
    GITHUB_OWNER +
    "/" +
    GITHUB_REPO +
    "/actions/workflows/" +
    encodeURIComponent(LAG_ALARM_WORKFLOW) +
    "/dispatches"
  );
}

export function workflowRunsUrl() {
  return (
    "https://api.github.com/repos/" +
    GITHUB_OWNER +
    "/" +
    GITHUB_REPO +
    "/actions/workflows/" +
    encodeURIComponent(LAG_ALARM_WORKFLOW) +
    "/runs?per_page=5"
  );
}

export function githubApiHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "brownsville-wait-times-worker/1.0 (+https://github.com/" +
      GITHUB_OWNER +
      "/" +
      GITHUB_REPO +
      ")",
  };
}

export function hasActiveLagAlarmRun(runsJson) {
  const runs = (runsJson && runsJson.workflow_runs) || [];
  for (let i = 0; i < runs.length; i++) {
    const status = runs[i] && runs[i].status;
    if (status && ACTIVE_RUN_STATUSES[status]) return true;
  }
  return false;
}

/**
 * POST workflow_dispatch for the lag-alarm workflow.
 * Skips when the secret is missing or a run is already active
 * (the workflow uses cancel-in-progress: true).
 */
export async function kickLagAlarmWorkflow(env, fetchImpl) {
  const fetchFn = fetchImpl || fetch;
  const token = env && env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return { ok: true, skipped: true, reason: "missing-token" };
  }

  try {
    const listRes = await fetchFn(workflowRunsUrl(), {
      method: "GET",
      headers: githubApiHeaders(token),
    });
    if (listRes.ok) {
      const runsJson = await listRes.json();
      if (hasActiveLagAlarmRun(runsJson)) {
        return { ok: true, skipped: true, reason: "already-running" };
      }
    }
  } catch (_) {
    // Listing is best-effort. Still dispatch so a stall is not left silent.
  }

  const res = await fetchFn(workflowDispatchUrl(), {
    method: "POST",
    headers: Object.assign(
      { "Content-Type": "application/json" },
      githubApiHeaders(token)
    ),
    body: JSON.stringify({ ref: LAG_ALARM_REF }),
  });

  // GitHub returns 204 No Content on a successful dispatch.
  if (res.status === 204 || res.ok) {
    return { ok: true, skipped: false, status: res.status };
  }

  let detail = "";
  try {
    detail = await res.text();
  } catch (_) {
    /* ignore */
  }
  return {
    ok: false,
    skipped: false,
    status: res.status,
    error: String(detail || "").slice(0, 200),
  };
}
