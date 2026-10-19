# Security review — Little World 1.4.1

Reviewed October 19, 2026 UTC (October 18 in America/New_York). This is a manual source review with automated regression tests, a credential-pattern scan, and an npm advisory audit. It is not an independent penetration test or a guarantee that all vulnerabilities have been found.

## Scope and key handling

Reviewed the browser source, generated assets, server, provider adapter, launcher, dependency lockfile, save/import handling, rendering, and Git credential boundaries. Traced the API key from server configuration to the provider authorization header. No code path intentionally returns the key to the browser, places it in a model prompt, or writes it to a story, bundle, or application log. The browser session nonce is separate from the provider credential.

The tracked example environment file has a blank key, and `.env.local` is ignored. The credential-pattern scan found no credential candidates in the tracked working files or reachable local Git blobs. The six commits on GitHub main were checked: five complete tree hashes match the locally scanned historical trees; the initial commit contains only a short README and was inspected separately. This does not cover deleted/unreachable GitHub objects, unrelated branches, external backups, or the private environment file on the user's Windows computer. No real user API key was provided to this review.

The reusable scanner reports paths/object IDs only. It detects selected OpenAI/GitHub/AWS credential patterns, private-key headers, populated OpenAI environment assignments, and tracked private environment files. Pattern scans can miss other secret formats and cannot prove absence of every secret.

## Findings fixed

| Finding | Exposure and impact | Change and regression coverage |
| --- | --- | --- |
| Provider endpoint inherited from environment | The installed SDK honors `OPENAI_BASE_URL`. A preexisting or modified shell environment could send the configured key to an unintended provider. This requires control of the local environment; it is not an unauthenticated remote exploit. | Pin `https://api.openai.com/v1` explicitly and reject HTTP redirects. The mocked SDK transport sets an untrusted environment URL and verifies the actual destination and redirect policy. |
| Uncaught request-target parsing | An invalid HTTP request target could reject the async server handler and disrupt availability of the local process. | Require an origin-form target, catch URL parsing errors, and return 400. Raw HTTP tests verify malformed targets are rejected and the server remains responsive without provider calls. |
| Compact-save memory amplification | A crafted downloaded save could repeat pooled memory references over many snapshots, consuming excessive memory/CPU despite the file-size bound. The user would have to load the file. | Preflight all compact snapshots and cap aggregate references at two million before expansion; cap individual memory text at 2,000 characters. Regression tests reject excessive compact histories and oversized memory text while preserving normal saves. |

Additional hardening rejects browser cross-site fetch metadata and sets `base-uri 'none'`, `form-action 'none'`, `Referrer-Policy: no-referrer`, and a same-origin resource policy. Static-file tests cover environment, Git, lockfile, and server-source paths.

## Other boundaries checked

- Production startup binds to `127.0.0.1`; Host and Origin checks reject unexpected origins. A random process-local token is required for decisions. Cross-site requests, missing/malformed tokens, and mismatched actor context are tested. This is a local service, not multi-user authentication.
- One shared request cap and one active provider slot are enforced again after asynchronous body parsing. Requests are bounded to 100 KB, model context to 20 KB, output to the configured token limit, and provider duration to the configured deadline. No automatic SDK retries are enabled. Limits are not a dollar budget and reset on restart.
- Context sanitization replaces character identity/personality with canonical values and includes only the deciding resident's selected memories, visible neighbors, local resources, and indexed choices. The browser is not a trusted multi-user authority: someone who controls a local client can fabricate story data within the request bounds. The simulation engine validates a returned action against its current legal list.
- Model text and memory text are untrusted. They are escaped for UI display and never evaluated as JavaScript or shell commands. Memory prompt injection can still influence a model's choice among legal actions; the prompt is not a security boundary. The model has no execution tools or access to the environment/key, and decorative dialogue never becomes new evidence.
- Imported resident identity/color/location and numeric state are validated before rendering. Event accounting, provenance, replay state, event counts, and compact references are checked. Save validation is not proof that a story represents real events; users can edit their own simulation data.
- The launcher runs `npm ci` and `npm start` in its project directory, with no elevation, downloaded PowerShell command, or security-control change. Dependencies execute with the local user's permissions. The review does not audit every line of third-party package source.

## Verification and remaining limits

All 56 tests pass, including real loopback HTTP checks and a mocked transport through the installed SDK. Type checking, build, generated standalone script syntax, credential-pattern scanning, and `git diff --check` pass. `npm audit` reported zero known vulnerabilities across the installed dependency graph at review time; this is advisory coverage, not a package trust guarantee.

No paid API call, live-key inspection, Windows execution, independent cloud security scan, or browser visual/interaction test was performed in this review. Earlier versions were user-tested on Windows. The built source and generated assets are included in the reviewed change.

A malicious local process, privileged extension, debugger, or compromised operating system can still obtain local credentials or use the running service. Other local clients share its request allowance. Do not expose the server to the internet or use it with untrusted users. Publish source rather than a ZIP of the configured working directory; ignored environment files can otherwise be included accidentally. Review shared save files for private story/model text.
