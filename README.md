# Employee & Project Dashboard

Employee & Project Dashboard is a vanilla JavaScript management app for monthly employee, project, assignment, vacation, and financial planning.

## Features

- Monthly localStorage snapshots for employees and projects.
- Project and employee tables with sorting, filtering, inline edits, and financial totals.
- Assignment creation, editing, unassignment, capacity controls, and project fit coefficients.
- Vacation calendar with working-day calculations.
- Seed data copy between months.
- Responsive layout for desktop and mobile screens.

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript with ES modules
- localStorage
- Node.js scripts for lint and tests

## Run Locally

```bash
pnpm start
```

Open `http://localhost:4173`.

## Quality Checks

```bash
pnpm lint
pnpm test
```

## Notes

The app intentionally does not use React, Vue, Angular, jQuery, or other UI frameworks.
