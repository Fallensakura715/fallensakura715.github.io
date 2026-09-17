# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

Package manager: Yarn 4.5.0 via `.yarn/releases/yarn-4.5.0.cjs`; `.yarnrc.yml` uses `nodeLinker: node-modules`.

- Install dependencies: `yarn install`
- Build static site: `yarn build` (`hexo generate`)
- Clean generated output: `yarn clean` (`hexo clean`)
- Start local dev server: `yarn server` (`hexo server`)
- Deploy through Hexo: `yarn deploy` (`hexo deploy`)

No lint, test, or single-test script is currently defined in `package.json`; do not invent one. CI in `.github/workflows/pages.yml` uses Node.js 24 with `npm install`, `npx hexo clean`, and `npx hexo generate` on pushes to `source`.

## High-level architecture

This is a Hexo static blog using the Butterfly theme.

- `_config.yml` is the main Hexo configuration. It controls site metadata, permalink/output directories, syntax highlighting, plugin settings, `theme: butterfly`, and Git deployment.
- `_config.butterfly.yml` is the Butterfly override layer. It controls navigation, colors, fonts, code blocks, math, Mermaid, PJAX, injected assets, and theme integrations.
- Authored content lives under `source/`, especially `source/_posts/*.md` and page directories such as `source/about`, `source/link`, `source/music`, `source/categories`, and `source/tags`.
- Site data consumed by templates/widgets lives in `source/_data/`, including `link.yml` and `widget.yml`.
- `source/.obsidian` contains authoring metadata and should be treated as editor/workflow metadata rather than runtime site code.
- `themes/butterfly` is the runtime/theme engine. Changes to rendering often require reading both Hexo config and theme files.

## Theme/runtime change paths

Butterfly behavior is spread across config, server-side Pug/templates/helpers, Stylus/CSS, and browser JS.

- Theme initialization and config merging: `themes/butterfly/scripts/events/init.js`
- CDN/plugin asset resolution: `themes/butterfly/scripts/events/cdn.js`
- CSS config injection: `themes/butterfly/scripts/events/stylus.js`
- Base shell template: `themes/butterfly/layout/includes/layout.pug`
- Route templates: `themes/butterfly/layout/index.pug`, `archive.pug`, `category.pug`, `tag.pug`, `post.pug`, and `page.pug`
- CSS entry/customization: `themes/butterfly/source/css/index.styl`, `var.styl`, and `themes/butterfly/source/css/Codex-theme-lite.css`
- Runtime JS: `themes/butterfly/source/js/main.js`, `utils.js`, `callout-parser.js`, and `katex-auto-render.js`
- Theme helpers: `themes/butterfly/scripts/helpers/page.js` and related helper files

When changing custom behavior, check the full path from config to Pug/helper output to client JS/CSS. PJAX is enabled in `_config.butterfly.yml`, so browser-side behavior that binds DOM events may need to re-run on `pjax:complete`.

## Repository instruction files

There is currently no root `README.md`, prior root `AGENTS.md`, `.cursorrules`, `.cursor/rules`, or `.github/copilot-instructions.md`. The README under `themes/butterfly/` is upstream Butterfly theme documentation, not repository-level workflow guidance.
