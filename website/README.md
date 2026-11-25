# react-table-mapping docs

Documentation site for react-table-mapping, built with Docusaurus and published at
https://react-table-mapping.github.io/react-table-mapping/ (English) and `/ko/` (Korean).

## Prerequisites

The site links the library at the repository root (`"react-table-mapping": "link:.."`) and imports its **built** output, so build it first — and again after every library change:

```bash
# from the repository root
yarn build:lib
```

## Commands

Run these in `website/`:

```bash
yarn install
yarn start          # dev server, English, http://localhost:3100/react-table-mapping/
yarn start:ko       # dev server, Korean (the dev server serves one locale at a time)
yarn build          # both locales into build/, fails on broken links
yarn serve          # serve build/ on port 3100, both locales
yarn check:demos    # with `yarn serve` running: opens every page in both locales,
                    # checks each live demo mounted and nothing logged an error
yarn write-translations   # refresh i18n/ko/*.json after adding UI strings
```

## Deployment

`.github/workflows/docs.yml` builds the library and this site on every push to `main` (or by hand from the Actions tab) and publishes `build/` to GitHub Pages. The repository's Pages source must be set to **GitHub Actions**.

## Layout

- `docs/` — English pages. `i18n/ko/docusaurus-plugin-content-docs/current/` — the same tree in Korean.
- `src/demos/*.tsx` — live demos. `<Demo component={X} source={XSource} />` (`src/components/Demo.tsx`) renders one and shows its own source beneath it.
- `plugins/single-react.ts` — makes the linked library use this project's React, so there is only one copy on the page.
