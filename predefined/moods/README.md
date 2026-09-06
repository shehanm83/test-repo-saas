# Predefined Mood Candidates

This folder contains candidate mood definitions and preview assets for review before importing them into the admin-managed mood catalog.

Each mood has:

- `mood.json`: metadata, palette, prompt guidance, tags, and preview asset path.
- `preview.png`: square generated mood preview image for admin/home mood cards.

`catalog.json` is the source list used to review or materialize the per-mood files.

Run `pnpm predefined:moods` from the repository root to upload previews and upsert every mood into the admin catalog as `published`.
