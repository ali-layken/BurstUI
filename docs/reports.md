# Reports: the contract between the apps and BurstUI (version 1)

Written 2026-11-20 by the main session for three parallel jobs (BurstUI, Surf World,
DoopWatcher). The BurstUI job commits this file into the BurstUI repository as
`docs/reports.md` and owns it from then on; the two app jobs build against it as written
and report any change they need instead of diverging.

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

An app treats anything but 200 as "not sent", keeps the report on disk (an outbox of at
most 5, oldest dropped) and tries again at its next start. It never retries in a loop and
never blocks or slows the app: sending happens off the main path with a 5 s timeout.

## Limits (the worst case must cost nothing)

- Size: refused while reading, before anything is parsed.
- Per install: 10 reports a day. Per address: 30 a day (count rows in the database; the
  address is stored only as a salted hash that is thrown away after a day, never raw).
- Per app: 2,000 stored a day; after that 503 until midnight UTC.
- Kept 90 days, then deleted by a scheduled job in the Worker.
- The same install sending the same signature again within a day: answer 200 with the
  first report's id and store nothing (a crash loop must not fill the table).

## What is stored (one table per app)

    id TEXT PRIMARY KEY, received_at INTEGER, happened_at TEXT, build TEXT, build_number
    INTEGER, kind TEXT, signature TEXT, os TEXT, runtime TEXT, install TEXT, session TEXT,
    note TEXT, log_lines INTEGER, bytes INTEGER, addr_hash TEXT, payload BLOB (the whole
    report, gzip)

Indexed on (received_at), (signature, received_at), (build_number). So the context is
readable without opening a blob: how many of which fault on which build and system.

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
