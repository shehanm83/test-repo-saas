# Predefined Home Showcase

This folder stores the homepage output gallery and the three comparison cards shown under the hero.

Run it against the currently configured environment:

```bash
set -a
source .env.local
set +a
pnpm predefined:home-showcase
```

The upload script syncs the singleton home showcase config and replaces the image list with the files declared in `showcase.json`. Local assets are uploaded to stable storage keys under `home-showcase/predefined/`.
