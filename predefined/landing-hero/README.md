# Predefined Landing Hero Sets

Each child folder with a `set.json` file is a predefined landing hero set. The upload script reads those folders, uploads local card assets to app storage, and upserts the set plus its four cards into the database.

Run it against the currently configured environment:

```bash
set -a
source .env.local
set +a
pnpm predefined:landing-hero
```

The script is idempotent by set name. If a set with the same `name` already exists, it updates that set and its cards. Local asset keys are stable under `landing-hero/predefined/<folder>/`, so repeated uploads replace the same predefined files.

If a predefined set is renamed, add the old database names to `previousNames` in `set.json`. The script will use those aliases to update the old record in place.

Card images can be provided in two ways:

- `asset`: relative path to an image inside the set folder. The script uploads it to storage.
- `imageUrl`: remote image URL. The script stores the URL directly.
