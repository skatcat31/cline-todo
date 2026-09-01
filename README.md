# agentic-todo

A To‑Do list application built with React 19, Vite and Material UI (MUI 9).
Tasks can have nested subtasks, and the whole list is persisted in the
browser's `localStorage`.

## Features

- Add, edit and delete tasks with optional descriptions – deletions (and
  "Clear completed") offer an "Undo" snackbar; it remembers the last five
  deletions and undoes them one by one, most recent first. When the
  snackbar auto‑hides, only the newest undo is finalized, so the previous
  ones stay available (each with its own 6‑second window)
- Add, edit, complete and delete nested subtasks, with per‑task progress
  ("2 of 5 subtasks done")
- Filter the list by status (All / Active / Completed) – the selection is
  remembered across reloads – with an active‑task counter and a "clear
  completed" action
- Search the list by task title, description or subtask title (transient –
  not persisted)
- Reorder tasks by dragging them onto another row (drag handle, with a drop
  indicator) or with the move up/down buttons (works on the visible list, so
  it behaves sensibly while a filter is active)
- Due dates on tasks: set when adding or editing; overdue and due‑today
  tasks are highlighted
- "Sort by due date" shows the visible list earliest‑due‑first (undated
  tasks last) instead of the manual order; the choice is remembered across
  reloads, and the manual reorder controls are disabled while it is on
- Local due‑date reminders: with browser notifications allowed, tasks that
  are due today are announced once per day per task (app‑bar toggle)
- Automatic persistence to `localStorage`, including cross‑tab sync
- Export the task list as a JSON file; importing into a non‑empty list asks
  whether to replace it or merge the imported tasks into it
- Color scheme: light / system / dark (app‑bar selector); the choice is
  persisted and the system option follows the OS preference live
- Progressive Web App: installable (SVG + 192/512 PNG + maskable icons) and
  fully usable offline, including the self‑hosted Roboto typeface
- Accessible Material Design UI (keyboard focus management, screen‑reader
  labels, Escape closes inline forms)

## Tech stack

| Concern     | Choice                                                                     |
| ----------- | -------------------------------------------------------------------------- |
| UI          | React 19, MUI 9 (direct‑path imports), Emotion                             |
| Build       | Vite 8, PWA via vite‑plugin‑pwa                                            |
| Tests       | Vitest 4, Testing Library, jsdom (80% coverage thresholds), Playwright E2E |
| Lint/format | ESLint 10 (flat config), Prettier                                          |
| CI/CD       | GitHub Actions → GitHub Pages                                              |
| Container   | Multi‑stage Docker build (Node → nginx)                                    |

## Getting started

```sh
npm install
npm run dev # start the dev server
```

## Scripts

| Script                 | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run dev`          | Start the Vite dev server                                          |
| `npm test`             | Run the test suite once                                            |
| `npm run test:watch`   | Run tests in watch mode                                            |
| `npm run test:e2e`     | Playwright end‑to‑end tests (production build + service worker)    |
| `npm run lint`         | ESLint over the whole project                                      |
| `npm run format`       | Prettier (write)                                                   |
| `npm run format:check` | Prettier (check)                                                   |
| `npm run build`        | Production build into `dist/`                                      |
| `npm run preview`      | Preview the production build locally                               |
| `npm run icons`        | Regenerate the PWA icons from the favicon design (`public/icons/`) |

Coverage is enforced at 80% (statements, branches, functions and lines) in
`vite.config.js`; run it with `npm test -- --coverage`. End‑to‑end tests
(`e2e/`) run the core user flows plus the PWA service worker / offline
behavior against a production build (`npm run test:e2e`).

## Project structure

```
src/
  App.jsx              App shell: task list layout, due‑date sort, reminders,
                       export/import, undo + import dialogs and warning
                       snackbars; the new‑task form, filter bar and theme
                       toggle live in components/
  main.jsx             Entry point (mounts App behind the ErrorBoundary)
  theme.js             createAppTheme(mode): light + dark Material themes
  hooks/
    useTasks.js           Task state (useReducer) + mutations + localStorage
                       persistence (lazy load, cross‑tab sync)
    usePersistentState.js useState mirrored into localStorage (best effort);
                       used for the filter and the due‑date sort
    useColorScheme.js   Color scheme (light/system/dark): persists the
                       choice, follows the OS preference live in "system"
                       mode, marks <html class="dark">
    useDueDateReminders.js Due‑date reminders: owns the Notification
                       permission + on/off choice and announces the tasks
                       due today (once per day per task, via a per‑day log)
  components/
    TaskItem.jsx       One task row, its edit form, subtask progress and
                       subtask management (focusToken moves focus to its
                       checkbox after a delete)
    SubtaskItem.jsx    One subtask row with an inline edit form
    SubtaskForm.jsx    Inline "add subtask" form (owns its draft state)
    NewTaskForm.jsx    New‑task card form (owns its draft state)
    FilterBar.jsx      All/Active/Completed buttons, active‑task
                       counter, "clear completed"
    SearchBar.jsx      Compact search box (the query is transient, owned by
                       the app; matching lives in utils/taskList.js)
    ThemeToggle.jsx    Light / system / dark selector for the app bar
    Placeholder.jsx    Empty state
    ErrorBoundary.jsx  Last‑resort crash UI with a reload button
  utils/
    taskFile.js        JSON export/import helpers (serialize, download,
                       parse + validate)
    taskList.js        Pure list‑level operations: filtering, counters,
                       due‑date sorting, the "clear completed" undo payload
                       and import merging
    dates.js           Due‑date helpers: local "YYYY‑MM‑DD" dates, overdue
                       detection and display formatting
    filters.js         The FILTERS list (value + label) shared by FilterBar
                       and the app‑level filter validation
    reminders.js       Due‑reminder payload: which tasks are due on a date
                       and the summary notification text for them
  test/
    setup.js           Vitest setup (localStorage polyfill, per‑test
                       isolation, RTL cleanup)
```

## Deployment

- **GitHub Pages** – pushing to `main` runs the CI workflow
  (`.github/workflows/ci.yml`): a `ci` job (lint, format check, test with
  coverage, build), an `e2e` job (Playwright) and a `deploy` job that
  publishes `dist/` to GitHub Pages. The Vite `base` is derived from
  `GITHUB_REPOSITORY` so asset URLs work under the repo sub‑path. GitHub
  Pages cannot set response headers, so the build injects a
  `Content-Security-Policy` meta tag into `index.html` instead.
- **Docker** – a multi‑stage build compiles the site with Node and serves
  it with nginx (running as the unprivileged `nginx` user on port 8080);
  nginx also sends the security headers (`Content-Security-Policy`,
  `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` – see
  `nginx.conf`):

  ```sh
  docker build -t agentic-todo .
  docker run -p 8080:8080 agentic-todo
  ```

## Node version

CI, Docker and the included `.nvmrc` all use Node 24 (LTS); the minimum
supported version is 20.19 (see `engines` in `package.json`).

## License

Released under the [MIT License](./LICENSE).
