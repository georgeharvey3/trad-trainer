# A Repertoire tune copies its Library tune

When a user adds a Library tune to the Repertoire, the app copies the title, the tune type and the beats into the `tunes` row. It also keeps a link to the Library tune in `library_tune_id`. The link points back to the source tune on The Session, for features like ABC or a link to the tune page. It is not the source of truth for the user's tune.

## Considered Options

- **Copy on add (chosen).** The user can edit the title and type of their tune. A re-ingest of the Library does not change the Repertoire. The practice queue and the SRS code read one table, as before.
- **Reference.** A linked tune reads its title and type from the Library row. Every read then joins two tables. An edit to a linked tune needs its own rule, and a re-ingest can change a tune that the user practises.

## Consequences

A Repertoire tune and its Library tune can drift apart. This is intentional. The one-off backfill for existing tunes sets only `library_tune_id`. It changes the type only on the rows that the user marks.
