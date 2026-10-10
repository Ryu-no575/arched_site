import { getStore } from "@netlify/blobs";

const ACTIVE_MS = 90_000;
const STORE_NAME = "arched-live-presence";
const KEY = "active-sessions";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}

function validId(value) {
  return typeof value === "string" &&
    value.length >= 8 &&
    value.length <= 100 &&
    /^[A-Za-z0-9._:-]+$/.test(value);
}

function prune(sessions, now) {
  const clean = {};
  for (const [id, lastSeen] of Object.entries(sessions || {})) {
    const t = Number(lastSeen);
    if (Number.isFinite(t) && now - t <= ACTIVE_MS) clean[id] = t;
  }
  return clean;
}

export default async (request) => {
  const now = Date.now();
  const store = getStore(STORE_NAME);

  if (request.method === "GET") {
    const current = await store.get(KEY, { type: "json", consistency: "strong" });
    const sessions = prune(current || {}, now);
    return response({ active: Object.keys(sessions).length, windowSeconds: ACTIVE_MS / 1000 });
  }

  if (request.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  let body = {};
  try { body = await request.json(); } catch {}
  if (!validId(body.id)) return response({ error: "Invalid client id" }, 400);

  // Optimistic retries reduce lost updates if several learners heartbeat together.
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getWithMetadata(KEY, {
      type: "json",
      consistency: "strong",
    });

    const sessions = prune(current?.data || {}, now);
    sessions[body.id] = now;

    let result;
    if (current) {
      result = await store.setJSON(KEY, sessions, { onlyIfMatch: current.etag });
    } else {
      result = await store.setJSON(KEY, sessions, { onlyIfNew: true });
    }

    if (result.modified) {
      return response({
        active: Object.keys(sessions).length,
        windowSeconds: ACTIVE_MS / 1000,
      });
    }
  }

  return response({ error: "Presence update busy" }, 503);
};
