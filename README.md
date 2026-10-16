# TaskFlow — Project & Task Management

A responsive web app for small teams to create projects, assign tasks, track progress and watch deadlines.
Built for the 7-Day Full-Stack Challenge (SRS v1.0) with **Next.js 14 (App Router) · React · Firebase Auth · Cloud Firestore · plain CSS**.

## Features

- Email/password registration, login, logout, persistent session, protected routes
- Google and Facebook sign-in; phone sign-in with SMS verification and reCAPTCHA
- Projects: create, edit, delete (with confirmation) — owner only
- Membership: owner adds/removes **existing** users by email; duplicates and unknown emails rejected; removal revokes access and unassigns tasks
- Tasks: create, edit, delete, status (To Do / In Progress / Done), priority, due date, assignee (must be a member)
- Search by title, filter by status / priority / assignee, **Overdue only** filter, sort by date / due date / priority
- Dashboard: accessible projects, totals, tasks by status, overdue list
- Loading, empty, error and access-denied states; accessible forms (labels, focus, keyboard, not colour-only)
- Responsive at 375 / 768 / 1280 px; automatic dark mode
- Firestore Security Rules enforce all permissions (`firestore.rules`)

## Setup

1. `npm install`
2. Create a Firebase project → enable **Authentication → Email/Password**, **Google**, **Facebook**, and **Phone** under Sign-in method; create a **Firestore** database.
3. Register a Web app, copy its config, then `cp .env.example .env.local` and fill the values.
4. Deploy the rules: paste `firestore.rules` into _Firestore → Rules → Publish_ (or `firebase deploy --only firestore:rules`).
5. `npm run dev` → http://localhost:3000
6. (Optional) `npm run seed` creates demo users `owner@example.test` / `member@example.test` (password `Demo1234!`) and the "Website Redesign" project.

For **Facebook**, create a Facebook Login app in Meta for Developers, add its App ID and App Secret under Firebase Authentication → Facebook, and register the Firebase OAuth redirect URI shown there in the Meta app. Add the local and deployed domains to Firebase Authentication → Settings → Authorized domains. Google sign-in also requires the app's domains to be authorized in Firebase.

### Phone sign-in testing

Use Firebase Authentication → Phone → **Phone numbers for testing** to register a fictional phone number and fixed verification code. The flow can then be tested without sending or charging real SMS messages. For local development, the Firebase Authentication Emulator is also supported: set `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` in `.env.local`, run `firebase emulators:start --only auth`, and restart Next.js after changing environment variables. The emulator prints the test SMS code in its terminal; no SMS is sent. The default UI uses Firebase's invisible reCAPTCHA for phone verification.

### Environment variables

`NEXT_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID`, `..._APP_ID`.
No service-account keys are used or needed. Never commit `.env.local`.

### Deploy (Vercel)

Import the GitHub repo, add the six env vars, deploy. Add the Vercel domain under _Firebase → Authentication → Settings → Authorized domains_.

## Structure

```
app/            routes: /, /login, /register, /dashboard, /projects/new, /projects/[id], /projects/[id]/settings
components/     AuthForm, ProjectForm, ProjectCard, TaskForm, TaskList, FilterBar, DashboardStats, States, ConfirmDialog, Navbar, ProtectedRoute
hooks/          useAuth (AuthProvider + context)
services/       users.js, projects.js, tasks.js  (all Firestore access)
lib/            firebase.js, utils.js (statuses, overdue, dates), permissions.js
firestore.rules security rules
scripts/seed.mjs demo data
```

## Firestore model

```
users/{uid}                        displayName, email, createdAt
projects/{projectId}               name, description, ownerId, memberIds[], createdAt, updatedAt
projects/{projectId}/tasks/{id}    title, description, status, priority, assigneeId|null,
                                   createdBy, dueDate ("YYYY-MM-DD")|null, createdAt, updatedAt
```

**Overdue** = `dueDate < today (local timezone)` and `status !== "done"` (`lib/utils.js → isOverdue`).

## Permissions (enforced in rules)

| Action                              | Owner | Member                  |
| ----------------------------------- | ----- | ----------------------- |
| View project/tasks                  | ✔     | ✔                       |
| Edit/delete project, manage members | ✔     | ✘                       |
| Create task                         | ✔     | ✔                       |
| Edit task                           | ✔     | own-created or assigned |
| Change status                       | ✔     | assigned only           |
| Delete task                         | ✔     | own-created only        |

## Manual test checklist (TC-01 … TC-16)

Register valid/invalid · login + refresh · signed-out dashboard redirects to /login · create project persists · member cannot edit project (denied) · add existing/unknown member · task without title blocked · status change persists · filter high priority · search keyword · open a foreign project URL → "Access denied" · forbidden write rejected by rules (try from the browser console with a second account) · 375 px layout · go offline and save → error shown, no false success.

## Known limitations

- Member lookup by email requires signed-in users to be able to read `users` docs (they contain only name, email, createdAt).
- Tasks are fetched per project and filtered client-side (fine for small datasets; no pagination).
- Project deletion removes tasks client-side in batches, then the project; if interrupted, the owner can retry.
- Ownership transfer, notifications and invitations are out of scope.
