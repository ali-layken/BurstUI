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

**Changed 2026-11-20 (attachments, migration 0002):** a `problem` report may now be larger
and carry up to 3 files (screenshots, text), every file is typed by its bytes, and each app
has a byte budget. A `crash` report keeps exactly the numbers below, so the apps need no
change. See "Limits by kind", "Files" and "Budget".

**Changed 2026-11-20 (hardening, migration 0003):** the source is public, so the limits
are built for someone who has read it. They are checked inside the insert (a burst cannot
slip past them), counted per kind, per address, per IPv6 /48 and per network operator; a
full total evicts the oldest reports instead of refusing new ones; counted bytes are what
a row really takes; only this site's pages, non-web schemes and non-browsers may send;
the network and country a report came from are kept with it; and the reader can find and
delete junk. The wire format and the answers the apps rely on (200 with the first id for a
repeated crash, 400/413 final, 429/503 retried) are unchanged. See "Limits", "Budget",
"Who may send", "Cleaning up" and "What is left".

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
(That is a `crash` report. A `problem` report may be 512 KB as sent, 1 MB unpacked, with 3
files of 200 KB: "Limits by kind".)

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

The goal: junk can cost at most the rest of the UTC day it is sent on, never longer than
the attack lasts, never money, and the developer can find and delete it.

- Size: refused while reading, before anything is parsed ("Limits by kind").
- Per UTC day and per app, each kept as a counter row (`report_limits`):

  | key                                   | reports | counted bytes | answer when over |
  | ------------------------------------- | ------- | ------------- | ---------------- |
  | one IPv4 address, or one IPv6 /64     | 30      | 2 MB          | 429              |
  | one IPv6 /48                          | 100     |               | 429              |
  | one network operator (`cf.asn`)       | 300     | 10 MB         | 429              |
  | one install id                        | 10      |               | 429              |
  | `crash` reports                       | 1,200   | 10 MB         | 503              |
  | `problem` reports                     | 500     | 40 MB         | 503              |

  The kinds have separate days, so picture junk cannot use up the room for crashes, nor
  crash junk the room for a person's report. (1,200 rather than 1,500 crashes keeps the
  worst day's rows written under D1's 100,000, see "Budget".)
- In all, per app: 200 MB counted. When a new report would not fit, the oldest reports'
  files are deleted to make room, then the oldest reports ("Budget"): a full total
  shortens how long old reports are kept, it never refuses for longer than one try.
- The address is only ever stored as a hash that is unlinkable after its day ("Server
  details").
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
    report, gzip), file_count INTEGER, stored_bytes INTEGER, asn INTEGER, country TEXT,
    file_bytes INTEGER

(Migration 0002: the payload no longer holds the files' bytes; each file is a row of
`files_<app>` (report_id, n, name, type, bytes, data BLOB: the raw bytes). Migration 0003:
`asn` and `country` are what Cloudflare saw (`request.cf`), never the address; `note`
keeps the first 200 characters, the payload all of it; `stored_bytes` and `file_bytes`
are counted bytes ("Budget"); `report_limits` holds the day's counters and each app's
total; `report_salts` the day's random salt.)

Indexed on (received_at), (signature, received_at), (build_number), (install,
received_at), and (received_at, id) for the reports that still have files. So the context
is readable without opening a blob: how many of which fault on which build, system and
network. Schema: `migrations/0001_reports.sql` to `0003_hardening.sql`.

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
look (what happened, and up to 3 "crash samples": screenshots or text files), sending a
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
  dots, no two alike; `b64` is standard base64 with padding. How many and how large
  depends on the kind ("Limits by kind"). Note: in a `crash`, two files that do not
  compress cannot both fit in 64 KB as sent (each is ~64 KB of base64); in practice one
  incompressible file of up to ~45 KB fits.
- The stored `payload` is the validated report re-written with only the known keys
  (gzip), not the bytes as sent, and with each file reduced to `{name, type, bytes}`; the
  bytes are in `files_<app>`. `bytes` is the size as sent; `received_at` is milliseconds
  since 1970 (UTC); `stored_bytes` is payload + files, what counts against the budget.
- Ids are `r_` and 16 characters of lower-case Crockford base32 (80 random bits), e.g.
  `r_p0z4eatwgg1z8b19`.

Answers (all JSON `{"ok": false, "error": "…"}` except the 200; all but the 403 with the CORS
headers, `access-control-allow-origin` being the request's own origin, or `*` when it has
none)

- 400 also for a `content-type` other than `application/json` (a `; charset` is fine), a
  `content-encoding` other than `gzip` or none, bad gzip, a body that is not UTF-8 JSON.
- 403 for a browser on another web origin ("Who may send"); no CORS headers on it.
- 404 for an unknown `<app>` in the address, 405 for methods other than POST / OPTIONS.
- 503 `"reports are not set up yet"` while the database or the salt secret is missing.
- `content-encoding: gzip` on a body that is not gzip is read as plain JSON (if anything on
  the way ever unpacks request bodies, reports still arrive).

Limits

- "A day" is the UTC day. The same-signature window is the last 24 hours.
- The address is `CF-Connecting-IP`; IPv6 counts per /64 and per /48. The keys in
  `report_limits` are the first 128 bits of SHA-256 over (the `REPORT_SALT` secret, the
  day's random salt from `report_salts`, the /64 or /48); `addr_hash` on a report is the
  /64's. The daily job deletes past days' salts, so a past day's hashes cannot be linked to
  an address even by someone holding the secret, and no row needs rewriting.
- The network is `request.cf.asn` (stored, not hashed: it names an operator, not a person).
- The order of checks: origin; the address, its /48 and its network (counter rows, before
  the body is read: a source over its count costs those reads and nothing else); size by
  kind; validity; then one read of every limit to choose the answer (same signature for a
  crash answers 200); eviction if the total is full; then the insert, which checks every
  limit again inside its own transaction. If the insert stores nothing (another request of
  the same burst got there first), the limits are read again to say which one.
- Rows read by one request: a source over its count, or a body refused: at most 4
  (salt, address, /48, network and total are primary-key reads; the salt once per Worker
  isolate a day). Refused by a later limit: about 30 more (the same-signature and install
  checks read at most 10 index entries each). Stored: about 30 more again for the insert's
  own checks; with an eviction, at most about 200 more (two scans of at most 25 reports and
  three statements over that set).
- Rows written by one stored report (D1 counts index entries): the row, its key and 4
  indexes (5 with files), 1 per file (`files_<app>` is `WITHOUT ROWID`), and 1 per counter:
  kind, address, network, total, and the /48 for IPv6. So 10 for a crash from IPv4 without
  files, at most 15 for a problem report with 3 files from IPv6. A refused request writes
  nothing.
- The scheduled job runs at 00:05 UTC: it deletes reports older than 90 days with their
  files, deletes past days' counters and salts, and recomputes each app's total from its
  table (so a hand delete or any drift corrects itself daily). That recompute reads every
  row of both tables once: at most about 1,700 × 90 = 153,000 an app, about 6% of D1's
  5,000,000 rows read a day.

The pages

- `/report/<app>?build=<build>` gives the report its build when the value is a valid build
  of that app (the person is never asked for it). Encode `+` as `%2B`; a raw `+` (which
  arrives as a space) is accepted too. Nothing else is read from the address.
- The page sends `kind: "problem"`, `signature: "report page"`, the build or
  `<app>-0+unknown` without one (builds start at 1),
  `platform: {os, runtime: "browser <name> <major>", source: "report page", locale}`,
  `context: {via: "report page", files: <how many>}`, an empty `log`, and gzip when the
  browser has `CompressionStream`. The install id is kept in `localStorage`
  (`burstui.report.install`).
- Crash samples, at most 3: pictures (PNG, JPEG, WebP, a GIF's first frame) are re-encoded
  in the browser through a canvas: long side at most 1600 px (never enlarged), WebP (JPEG
  where the browser cannot encode WebP), quality stepped down from 0.86 until the file is
  at most 150 KB. The re-encode keeps only pixels, so photo metadata (place, time, camera)
  is gone. Text files (.txt .log .json .md .cfg .csv) and a Surf World .swr replay go as
  they are, at most 48 KB each, after the page has checked they are what the server will
  accept. A list under the field shows each file's name and size as sent, with Remove; a
  picture pasted into the note is added as a sample.
- The pages are `noindex` and not in the sitemap.

## Limits by kind

The body is read and unpacked against the larger numbers (512 KB as sent, 1 MB unpacked:
refused while reading, as before), then a report that is not `kind: "problem"` is held to
the `crash` numbers before anything else is checked.

|                     | `crash` (the apps, version 1) | `problem` (a person's report) |
| ------------------- | ----------------------------- | ----------------------------- |
| as sent             | 64 KB                         | 512 KB                        |
| unpacked            | 512 KB                        | 1 MB                          |
| files               | 2                             | 3                             |
| each file (decoded) | 48 KB                         | 200 KB                        |
| file of another type| kept, typed `bin`             | refused (400)                 |

## Files

The server decides what a file is from its bytes, never from its name or anything the
client says (`worker/reports/files.ts`):

| type   | bytes                                   | written by the reader as |
| ------ | --------------------------------------- | ------------------------ |
| `png`  | `89 50 4E 47 0D 0A 1A 0A`               | `.png`                   |
| `jpeg` | `FF D8 FF`                              | `.jpg`                   |
| `webp` | `RIFF` …4 bytes… `WEBP`                 | `.webp`                  |
| `gif`  | `GIF87a` or `GIF89a`                    | `.gif`                   |
| `swr`  | `SWR1` (Surf World's replay)            | `.swr`                   |
| `text` | valid UTF-8 with no NUL byte            | its own .txt .log .json .md .cfg .csv, else `.txt` |

Anything else is refused (400) in both kinds. (Until the hardening a crash kept a file of
another type as `bin`; the apps never needed it: Surf World sends `SWR1` replays and a UTF-8
log, DoopWatcher sends no files.) Nothing from a file is ever rendered, executed or parsed
beyond those magic bytes and the UTF-8 check, on the server or in the reader; the reader
writes the bytes to `.reports/<id>/` and nothing else.

## Budget

Counted bytes are what a report really takes in the database: the payload, every column as
stored (the text columns that are index keys twice), a fixed 256 bytes of row and index
overhead, and per file its data, name, type and a 64-byte row (`store.ts countedBytes`).
The `note` column keeps 200 characters; the payload keeps all 2,000.

Each app's total lives in `report_limits` (day 0, key `total`). When a new report would
take it over 200 MB, the Worker first deletes the files of the oldest reports that still
have files (their rows and payloads stay, `file_count` and `file_bytes` become 0), then, if
that is not enough, the oldest reports themselves; each step looks at no more than the 25
oldest. Only if that still does not make room is the report refused (503, and the next try
frees more). The daily caps stay refusals: they end at midnight UTC.

The daily job recomputes each total from the table rather than subtracting, so the
counter cannot drift.

The worst day, if every limit is hit:

- Bytes: per app 10 MB of crashes and 40 MB of problem reports a day, 200 MB in all; both
  apps 400 MB counted against D1's 500 MB. A sustained attack at the maximum turns over the
  total in about 4 days: under it, reports are kept about 4 days instead of 90, and the
  oldest screenshots go first.
- Rows written: per app 1,200 crashes × at most 14 + 500 problem reports × at most 15 =
  24,300; both apps 48,600. On a day when the daily job also deletes a maximal day from 90
  days earlier (about 31,600 rows written for both apps) and that day's counters (about
  10,200): about 90,400 of D1's 100,000. Past it D1 refuses writes until midnight UTC
  (503 everywhere for the rest of that day); nothing is billed.
  On days when the total is full, the evictions delete what the daily job would otherwise
  delete later, so they replace its writes rather than add to them.
- Rows read: about 30 for each request that gets as far as the limits, so the free plan's
  100,000 Worker requests a day cost at most about 3,000,000, plus at most about 200 more
  for each of the 3,400 reports a day that may need an eviction (680,000) and the daily
  recompute (about 306,000): under D1's 5,000,000.
- CPU: the largest accepted report (3 incompressible pictures, 518 KB as sent, 690 KB
  unpacked) measured 4.1 ms on this machine (unpack 2.2, parse 0.5, base64 1.3, payload
  gzip 0.03); gzipping the files with the payload, as version 1 did, cost 13.8 ms on its
  own, which is why files are stored apart and raw. The free plan allows 10 ms.

## Who may send

A request with an `Origin` header that is an http or https origin other than this site's
own, or `Origin: null` (a sandboxed frame, a `file:` page), gets 403, and so does its
preflight. A request with no `Origin` (the game, curl) and one from another scheme (an
Overwolf app's page is `overwolf-extension://<its id>`; we do not know the id, which is why
the rule is by scheme) is allowed, and the answer echoes its origin instead of `*`. This
removes one thing only: a web page making each of its visitors' browsers send reports.
Anything that is not a browser can leave `Origin` out, and is held by the limits above.

## Cleaning up

Every field the reader groups on by default (build, signature, install, os) is the
sender's choice; the network (`asn`) and `country` are not. To find junk:
`npm run reports -- count --by network`, `--by install`, `--by country`, then look with
`list --network N` (or `--install`, `--country`, `--since/--until`), and delete it with
the same filters: `npm run reports -- delete <app> --network N --since 2026-11-20` says how
many reports, files and bytes match; add `--yes` to delete them. The deletion is files,
then reports, then each app's total recomputed from what is left, sent as one
`wrangler d1 execute` command. It does not give back the day's counts (deleting today's
junk does not let more junk in today).

## What is left

- Junk that copies real builds and signatures, sent from many residential addresses on
  many networks, looks like real reports. Telling it apart needs something the apps hold
  and an attacker cannot read: a secret, which a public client cannot keep. The limits
  bound how much of it a day can hold; `delete` removes it once found.
- The free plan's 100,000 Worker requests a day are per account: one person can use them
  up for every Worker path (including `/api/joke` and the large file) until midnight UTC.
  That was true before this service existed and needs a paid plan or Cloudflare's own
  rate limiting in front to change.
- Not answered from Cloudflare's documentation: whether a Worker on another account's
  `*.workers.dev` counts as the same zone, which would let it set `CF-Connecting-IP` on
  its requests to this one. The per-network cap bounds it either way (such requests come
  from Cloudflare's own network), a custom domain removes the question, and the zone
  setting "Pseudo IPv4: overwrite headers" must stay off (it would replace real IPv6
  addresses with made-up IPv4 ones).
- The network cap is shared by every genuine user of that network: a busy ISP's users
  could meet it on a day someone attacks from the same ISP.

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

Later migrations: add `migrations/000N_….sql`, apply with the same `--remote` command
before merging code that needs it. **Migration 0002 (attachments) must be applied before
the attachments code is deployed**: the new code writes columns and tables that 0001 does
not have, so until it is applied every report would get a 503 ("storage failed"):

```shellsession
$ npx wrangler d1 migrations apply burst-reports --remote        # applies 0002_files_and_budget.sql
```

The same holds for **migration 0003 (hardening)**: apply it before the hardening code is
deployed (the same command applies `0003_hardening.sql`). It adds the `asn`, `country` and
`file_bytes` columns, the `report_limits` and `report_salts` tables, a partial index, and
drops `report_counters` and the `addr_hash` index; on an empty database it writes a handful
of rows.

## Reading reports

`scripts/reports.mjs` (`npm run reports -- …`) reads through `wrangler d1 execute` under
your own login:

```shellsession
$ npm run reports -- list [surfworld|doopwatcher] [filters] [--limit N]
$ npm run reports -- count [app] [filters] [--by signature|network|country|install|build] [--limit N]
$ npm run reports -- show r_p0z4eatwgg1z8b19                 # context, platform, the log as a table, files to .reports/<id>/
                                                             # (each named by the type found in its bytes: .png .jpg .webp .gif .swr .txt)
$ npm run reports -- show r_p0z4eatwgg1z8b19 --raw           # the whole report as JSON
$ npm run reports -- delete [app] [filters] [--yes]          # says what matches; deletes only with --yes
```

Filters: `--id`, `--install HEX`, `--network ASN`, `--country CC`, `--addr HASH`,
`--signature S`, `--build N`, `--days D` or `--since TIME [--until TIME]` (an ISO time or
ms since 1970). `list` and `count` default to the last 7 days; `delete` has no default and
needs at least one filter. `count` sorts by how many and returns at most `--limit` groups
(default 50, at most 1,000; `list` at most 10,000 rows), so no answer can outgrow the
reader's buffer. Add `--local` to read the local dev database. Report text is printed with
control and bidi characters escaped, so a report cannot drive the terminal; file names are
checked again before anything is written; the one free-text filter (`--signature`) goes
into the SQL as a hex literal.

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
