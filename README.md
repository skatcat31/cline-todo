# agentic-todo

A To‑Do list application built with React 19, Vite and Material UI (MUI 5).
Tasks can have nested subtasks, and the whole list is persisted in the
browser's `localStorage`.

## Features

- Add, edit and delete tasks with optional descriptions – deletions (and
  "Clear completed") offer an "Undo" snackbar
- Add, edit, complete and delete nested subtasks, with per‑task progress
  ("2 of 5 subtasks done")
- Filter the list by status (All / Active / Completed) – the selection is
  remembered across reloads – with an active‑task counter and a "clear
  completed" action
- Automatic persistence to `localStorage`, including cross‑tab sync
- Export the task list as a JSON file; importing into a non‑empty list asks
  whether to replace it or merge the imported tasks into it
- Light / dark color scheme: app‑bar toggle, persisted choice, follows the
  OS preference on first visit
- Progressive Web App: installable and fully usable offline
- Accessible Material Design UI (keyboard focus management, screen‑reader
  labels, Escape closes inline forms)

## Tech stack

| Concern     | Choice                                                     |
| ----------- | ---------------------------------------------------------- |
| UI          | React 19, MUI 5 (direct‑path imports), Emotion             |
| Build       | Vite 8, PWA via vite‑plugin‑pwa                            |
| Tests       | Vitest 4, Testing Library, jsdom (80% coverage thresholds) |
| Lint/format | ESLint 9 (flat config), Prettier                           |
| CI/CD       | GitHub Actions → GitHub Pages                              |
| Container   | Multi‑stage Docker build (Node → nginx)                    |

## Getting started

```sh
npm install
npm run dev # start the dev server
```

## Scripts

| Script                 | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start the Vite dev server            |
| `npm test`             | Run the test suite once              |
| `npm run test:watch`   | Run tests in watch mode              |
| `npm run lint`         | ESLint over the whole project        |
| `npm run format`       | Prettier (write)                     |
| `npm run format:check` | Prettier (check)                     |
| `npm run build`        | Production build into `dist/`        |
| `npm run preview`      | Preview the production build locally |

Coverage is enforced at 80% (statements, branches, functions and lines) in
`vite.config.js`; run it with `npm test -- --coverage`.

## Project structure

```
src/
  App.jsx              App shell: new‑task form + task list layout,
                       filters, theme toggle, export/import, undo + warning
                       snackbars
  main.jsx             Entry point (mounts App behind the ErrorBoundary)
  theme.js             createAppTheme(mode): light + dark Material themes
  hooks/
    useTasks.js        Task state (useReducer) + mutations + localStorage
                       persistence (lazy load, cross‑tab sync)
  components/
    TaskItem.jsx       One task row, its edit form, subtask progress and
                       subtask management
    SubtaskItem.jsx    One subtask row with an inline edit form
    SubtaskForm.jsx    Inline "add subtask" form (owns its draft state)
    Placeholder.jsx    Empty state
    ErrorBoundary.jsx  Last‑resort crash UI with a reload button
  utils/
    taskFile.js        JSON export/import helpers (serialize, download,
                       parse + validate)
  test/
    setup.js           Vitest setup (localStorage polyfill, per‑test
                       isolation, RTL cleanup)
```

## Deployment

- **GitHub Pages** – pushing to `main` runs the CI workflow
  (`.github/workflows/ci.yml`): lint, format check, test with coverage,
  build, then deploy `dist/` to GitHub Pages. The Vite `base` is derived
  from `GITHUB_REPOSITORY` so asset URLs work under the repo sub‑path.
- **Docker** – a multi‑stage build compiles the site with Node and serves it
  with nginx:

  ```sh
  docker build -t agentic-todo .
  docker run -p 8080:80 agentic-todo
  ```

## Node version

CI, Docker and the included `.nvmrc` all use Node 24 (LTS); the minimum
supported version is 20.19 (see `engines` in `package.json`).
