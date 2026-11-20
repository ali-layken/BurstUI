# Reports: the contract between the apps and BurstUI (version 1)

Written 2026-11-20 by the main session for three parallel jobs (BurstUI, Surf World,
DoopWatcher). The BurstUI job commits this file into the BurstUI repository as
`docs/reports.md` and owns it from then on; the two app jobs build against it as written
and report any change they need instead of diverging.

The wire format below is unchanged from what the apps were built against. One behaviour
changed (the same-signature rule applies to `crash` reports only, see "Limits"), and
"Server details" at the end spells out what the server checks where the text below leaves
room. "Setting it up" is what the owner runs to make it live; "Reading reports" is the
developer's script.

## What the owner asked for (2026-11-20)

- Crashes only, not a stream of user data: "i dont want all the replays all the time i only
  need crashes". No recording of play is uploaded except as part of one crash or problem
  report. Nothing is collected for training.
- "in each app we need to take crashes and the logs right before them and dump them to
  cloudflare".
- "we can create 2 report a problem pages on burstui 1 for doopwatcher 1 for surfworld".
- "we have to make sure the size is small the logs are bloblike but need to be structred so
  we know some info about the context of the issues. consitent build naming."
- Separate storage per app ("another bucket for doopwatcher").

## Shape

    app (Surf World / DoopWatcher)            BurstUI Worker                 storage
    ------------------------------            --------------                 -------
    ring of structured log lines   --POST-->  /api/report/<app>   -------->  D1 database
    crash or "report a problem"               validates, caps, limits         one table per app:
                                                                              context columns
    browser: /report/<app> form    --POST-->  the same address                + one gzip blob

- Storage is Cloudflare D1 (free plan: 500 MB per database, 5 GB per account, 100,000 rows
  written a day, a row at most 2 MB; over a daily limit queries fail, nothing is billed).
  R2 is not enabled on the account and is not needed. One database `burst-reports` with
  one table per app (`reports_surfworld`, `reports_doopwatcher`): the owner's "one bucket
  per app". Keep storage behind one small module so it could move to R2 later.
- The developer reads reports with a script in the BurstUI repository that goes through
  `wrangler d1 execute` (the developer's own login). There is NO public page that lists or
  shows reports.

## Build names

`<app>-<number>+<commit>`: lower case, the app's slug, an increasing whole number, then
the short git commit the build was made from (`.dirty` appended if the tree had changes;
`dev` in place of the commit if unknown). The number alone orders builds; the commit says
exactly what code it was.

- Surf World: `surfworld-3+6a41740`. The number is the build's ordinal (0.0 was 1, 0.1 was
  2; the owner says "the next surf world is 3"). The Surf World job says where the number
  lives and how it relates to `config/version`.
- DoopWatcher: `doopwatcher-<N>+<commit>`. Tags like `v0.0.1.38` already exist; the
  DoopWatcher job finds out what makes that fourth number and uses it as N if it is
  already an increasing build number, else proposes one (the owner: "mostly goes by main
  commit but we can figure out an increment system for it").

Pattern the server accepts: `^[a-z]+-[0-9]+\+[0-9a-z.]+$`, at most 48 characters.

## The request

    POST https://burstui.bean-prod.workers.dev/api/report/<app>      app: surfworld | doopwatcher
    content-type: application/json
    content-encoding: gzip            (optional; apps should send gzip, the web form may not)

Body: one JSON object, the report. At most 64 KB as sent, at most 512 KB after unpacking.

    {
      "v": 1,
      "app": "surfworld",                    must equal the address's <app>
      "build": "surfworld-3+6a41740",
      "kind": "crash",                       "crash": the app found it by itself
                                             "problem": a person pressed "report a problem"
      "signature": "unclean-exit",           short stable text that is the same for the same
                                             fault, so reports can be counted together: for
                                             a script error its message and top frame with
                                             numbers and paths stripped; at most 120 chars
      "when": "2026-11-20T17:01:22Z",        when it happened, the app's clock, UTC
      "install": "9f2c…",                    32 hex: random, made once per install, tied to
                                             nothing; lets one install's reports be grouped
                                             and limited
      "session": "51ab…",                    16 hex: random per run of the app
      "platform": {                          flat, strings only, at most 12 keys of 80 chars
        "os": "Windows 11", "arch": "x86_64",
        "runtime": "godot 4.2.2",            or "overwolf 0.3xx"
        "gpu": "…", "locale": "en_US"
      },
      "context": {                           flat: string, number or boolean values, at most
        "area": "tower", "state": "wall_ride",   32 keys, a string at most 200 chars. What the
        "online": false                          app was doing when it happened. App-defined.
      },
      "note": "",                            a person's words (kind "problem"), at most 2000
      "log": [                               the last lines before it, oldest first, at most
        {"t": 81234, "lvl": "info",          400 lines. t: ms since the session started.
         "src": "net", "msg": "joined",      lvl: debug | info | warn | error.
         "data": {"players": 2}}             src: the app's subsystem (short, lower case).
      ],                                     msg: at most 300 chars. data: optional, flat.
      "files": [                             optional, at most 2, each at most 48 KB before
        {"name": "session.swr",              base64. Surf World: the replay of the session
         "b64": "…"}                         (it reproduces the run exactly). Names:
      ]                                      [A-Za-z0-9._-], at most 64 chars.
    }

Unknown top-level keys are refused (400), so the two sides cannot drift silently.
No names, e-mail addresses, account ids, tokens, stream keys, machine names or home-folder
paths go in a report: the app strips them before sending (a path is cut to what follows
the app's own folder).

## The answer

    200 {"ok": true, "id": "r_7f3k2m"}      stored
    400 {"ok": false, "error": "…"}         not a valid report (the text says which field)
    413                                      too large
    429                                      this install or this address has sent too many
    503                                      the day's total is used up, or storage failed

CORS: `access-control-allow-origin: *` on this path and an `OPTIONS` answer allowing
`content-type` and `content-encoding`, because an Overwolf app's page is another origin.
No cookies, no credentials.

An app treats anything but 200 as "not sent". A 400 or a 413 is final (the same report
can never be accepted): the app drops it and notes that in its own log. Anything else (a
429, a 5xx, no answer) keeps the report on disk (an outbox of at most 5, oldest dropped)
to be tried again at the app's next start. It never retries in a loop and never blocks or
slows the app: sending happens off the main path with a 5 s timeout. (Changed 2026-11-20:
400 and 413 were kept in the outbox before.)

## Limits (the worst case must cost nothing)

- Size: refused while reading, before anything is parsed.
- Per install: 10 reports a day. Per address: 30 a day (count rows in the database; the
  address is stored only as a salted hash that is thrown away after a day, never raw).
- Per app: 2,000 stored a day; after that 503 until midnight UTC.
- Kept 90 days, then deleted by a scheduled job in the Worker.
- The same install sending the same signature again within a day: answer 200 with the
  first report's id and store nothing (a crash loop must not fill the table).
  **Changed 2026-11-20: crashes only.** A `problem` report is always stored (within the
  daily limits), so two problems a person reports on one day are both kept even if the app
  gives them the same signature.

## What is stored (one table per app)

    id TEXT PRIMARY KEY, received_at INTEGER, happened_at TEXT, build TEXT, build_number
    INTEGER, kind TEXT, signature TEXT, os TEXT, runtime TEXT, install TEXT, session TEXT,
    note TEXT, log_lines INTEGER, bytes INTEGER, addr_hash TEXT, payload BLOB (the whole
    report, gzip)

Indexed on (received_at), (signature, received_at), (build_number). So the context is
readable without opening a blob: how many of which fault on which build and system.
(Also on (install, received_at) and (addr_hash, received_at), so the daily limits read a
handful of rows. Schema: `migrations/0001_reports.sql`.)

## What each app does

1. Keeps a ring of structured log lines in memory (the last 400) and mirrors it to a small
   file that survives a crash (written as events happen; events are occasional things such
   as "joined a match" or "GEP registered", never one per frame or tick).
2. Detects a crash: whatever is real for its runtime (an unclean exit found at the next
   start; an unhandled script error where the runtime can report one).
3. Has a setting for crash reports with three values: ask (the default), always, never.
   "Ask" shows exactly what would be sent before sending.
4. Has a "report a problem" entry that either sends a `problem` report with a note from
   inside the app, or opens `https://burstui.bean-prod.workers.dev/report/<app>` with the
   build name in the address (`?build=…`; nothing else goes in an address).

## The pages

`/report/surfworld` and `/report/doopwatcher` on BurstUI: a short form in the site's own
look (what happened, the build if known, an optional file the app exported), sending a
`problem` report to the same address. It says in one plain sentence what is sent and that
it is kept 90 days.

## Server details

What `worker/reports/` does where the text above leaves room. The numbers live in
`worker/reports/contract.ts`, which the Worker and the `/report/<app>` pages both use.

Fields

- Required: `v` (1), `app`, `build`, `kind`, `signature`, `when`, `install`, `session`,
  `log` (may be `[]`). Optional: `platform` (default `{}`), `context` (`{}`), `note`
  (`""`), `files` (`[]`).
- `build`: the pattern and 48 characters, and it must start with the address's own app
  (`surfworld-…` only at `/api/report/surfworld`). The number must fit a whole number
  below 2^53.
- `when`: `YYYY-MM-DDTHH:MM:SS`, optional fraction, then `Z` or `+00:00` (Godot's
  `Time.get_datetime_string_from_system(true)` has no `Z`: add it).
- `install` / `session`: hex in either case; stored lower case.
- Key names in `platform`, `context` and log `data`: 1-32 characters of
  `A-Z a-z 0-9 _ . -`. `data` has the same limits as `context` (32 keys, strings at most
  200 characters, string / number / boolean values; no `null`, no nesting).
- Log lines: exactly the keys `t`, `lvl`, `src`, `msg` and optional `data`; anything else is
  refused, as at the top level. `t` is any number 0 or more (fractions allowed). `src` is
  1-32 characters of `a-z 0-9 _ . -`.
- Characters are counted as Unicode code points. Control characters (U+0000-001F,
  U+007F-009F) are refused in `build`, `signature`, `platform` values, `src` and key
  names; free text (`note`, `msg`, `context` / `data` strings) may contain them (the
  reader escapes them).
- `files`: each exactly `name` and `b64`; names `[A-Za-z0-9._-]`, at most 64, not only
  dots, no two alike; `b64` is standard base64 with padding, at most 49,152 bytes decoded.
  Note: two files that do not compress cannot both fit in 64 KB as sent (each is ~64 KB
  of base64); in practice one incompressible file of up to ~45 KB fits.
- The stored `payload` is the validated report re-written with only the known keys
  (gzip), not the bytes as sent. `bytes` is the size as sent; `received_at` is
  milliseconds since 1970 (UTC).
- Ids are `r_` and 16 characters of lower-case Crockford base32 (80 random bits), e.g.
  `r_p0z4eatwgg1z8b19`.

Answers (all JSON `{"ok": false, "error": "…"}` except the 200, all with the CORS headers)

- 400 also for a `content-type` other than `application/json` (a `; charset` is fine), a
  `content-encoding` other than `gzip` or none, bad gzip, a body that is not UTF-8 JSON.
- 404 for an unknown `<app>` in the address, 405 for methods other than POST / OPTIONS.
- 503 `"reports are not set up yet"` while the database or the salt secret is missing.
- `content-encoding: gzip` on a body that is not gzip is read as plain JSON (if anything on
  the way ever unpacks request bodies, reports still arrive).

Limits

- "A day" for the per-install, per-address and per-app limits is the UTC day. The
  same-signature window is the last 24 hours.
- The address is `CF-Connecting-IP`; IPv6 addresses count per /64. `addr_hash` is the
  first 128 bits of SHA-256 over (the `REPORT_SALT` secret, the UTC day, the address).
- The order of checks: size, validity, same signature (crash only, answers 200), address,
  install, app total.
- The scheduled job runs at 00:05 UTC: it deletes rows older than 90 days and sets
  `addr_hash` to NULL on every row from before that UTC day.

The pages

- `/report/<app>?build=<build>` fills the build field when the value is a valid build of
  that app. Encode `+` as `%2B`; a raw `+` (which arrives as a space) is accepted too.
  Nothing else is read from the address.
- The page sends `kind: "problem"`, `signature: "report page"`, the build or
  `<app>-0+unknown` when the person leaves it empty (builds start at 1),
  `platform: {os, runtime: "browser <name> <major>", source: "report page", locale}`,
  `context: {via: "report page", file: true|false}`, an empty `log`, and gzip when the
  browser has `CompressionStream`. The install id is kept in `localStorage`
  (`burstui.report.install`).
- The pages are `noindex` and not in the sitemap.

## Setting it up

Until these are done the site deploys and works as before and `/api/report/*` answers
503. `wrangler.jsonc` carries a placeholder `database_id`
(`00000000-0000-0000-0000-000000000000`); while it is there, `scripts/deploy.mjs` (what
the GitHub workflow and `npm run deploy` run) deploys without the `REPORTS` binding,
because Cloudflare refuses a Worker bound to a database that does not exist.

Run from the repository, logged in as the account owner (`npx wrangler login`):

```shellsession
$ openssl rand -hex 32 | npx wrangler secret put REPORT_SALT      # the address-hash salt; never stored anywhere else
$ npx wrangler d1 create burst-reports                             # prints the new database_id
```

Put the printed `database_id` into `wrangler.jsonc` in place of the placeholder (keep the
`// <reports-d1>` marker lines; if wrangler offers to add the binding to the config itself,
say no, the block is already there), then create the tables in the real database:

```shellsession
$ npx wrangler d1 migrations apply burst-reports --remote
```

Then land the `wrangler.jsonc` change through a pull request as usual; the deploy on
merge binds the database and the endpoint goes live. Check it:

```shellsession
$ curl -si -X OPTIONS https://burstui.bean-prod.workers.dev/api/report/surfworld | head -3
$ npm run reports -- list
```

The GitHub token (`CLOUDFLARE_API_TOKEN`) has Workers Scripts: Edit and Account Settings:
Read. Whether Cloudflare also wants a D1 permission on it to deploy a Worker with a D1
binding was not verified; if that deploy fails with an authorization error, add
Account > D1 > Edit to the token and re-run the job. The cron trigger (00:05 UTC) is in
`wrangler.jsonc` and is deployed with the Worker (the free plan allows 5).

Later migrations: add `migrations/0002_….sql`, apply with the same `--remote` command
before merging code that needs it.

## Reading reports

`scripts/reports.mjs` (`npm run reports -- …`) reads through `wrangler d1 execute` under
your own login:

```shellsession
$ npm run reports -- list [surfworld|doopwatcher] [--build N] [--signature S] [--days D] [--limit N]
$ npm run reports -- count [app] [--build N] [--days D]     # how many of which signature on which build
$ npm run reports -- show r_p0z4eatwgg1z8b19                 # context, platform, the log as a table, files to .reports/<id>/
$ npm run reports -- show r_p0z4eatwgg1z8b19 --raw           # the whole report as JSON
```

`--days` defaults to 7. Add `--local` to read the local dev database. Report text is
printed with control and bidi characters escaped, so a report cannot drive the terminal;
file names are checked again before anything is written.

## Developing locally

```shellsession
$ echo REPORT_SALT=dev > .dev.vars                              # gitignored
$ npx wrangler d1 migrations apply burst-reports --local
$ npm run preview                                               # build + wrangler dev on :8787, with a local D1
$ npm run reports -- list --local
$ npm test                                                      # tests/reports.test.mjs: its own throwaway D1 and port
```

`npm run dev` (Astro alone) shows the pages but has no Worker, so sending from them fails
there ("could not be sent").
