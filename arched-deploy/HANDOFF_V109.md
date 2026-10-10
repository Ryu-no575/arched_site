# ARCHED V109

Canonical source continues V108. Changes: public/runtime109.js and compat109.css loaded before study scripts; all client localStorage call sites use the shared fail-safe adapter. Native keys remain unchanged. Memory fallback survives document replacement, warns clearly, and feeds existing account sync; unsynced data can still be lost on close. Auto/Light/Standard modifies canvas pixel ratio and software globe texture/render budget, without resetting a question. Atlas recall/decay semantics remain unchanged.

Netlify build stages private/media in .netlify/v1/blobs/deploy/media/<name>/blob. The function includes only private/manifest.json, private/client/** and script files. Media reads pass paid authorization and filename validation before the injected getDeployStore read. Member stores remain site-wide and retain names. Deploy Preview member stores are shared: use a separate test project for mutating tests. getDeployStore runtime binding and actual publishing are not live-verified.

Run python3 build_client87.py after canonical client/data edits; node scripts/prepare-deploy109.mjs refreshes gzip and stages deployment assets. Use release_revision109.py for the archival source and package_deploy109.py for the selected runtime repository. No secrets or user account records are included.

Passed: verify_runtime109.cjs, server/verify_media109.mjs, audit_revision108.cjs, audit_glow107.cjs, server/verify_study58.mjs, server/verify_access_v49.mjs. This environment has no supported browser-control QA path; no browser rendering, device throttling, Mac/Windows/iOS hardware tests or live payments. V108 photo coverage limitations persist.
