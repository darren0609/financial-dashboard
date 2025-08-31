# Financial Dashboard

Short project overview
- A local full-stack financial dashboard (Express + MongoDB backend, React frontend).
- Tracks users, accounts, transactions and supports rule-based categorisation of transactions.
- Admin UI for managing categories, previewing/applying pattern-based recategorisation, resolving conflicts and mapping common descriptions to categories.
- Includes reporting: category summaries (by period) and description summaries for mapping rules.

Prerequisites
- Node.js (16+ recommended)
- npm
- MongoDB (local or remote)
- Windows PowerShell or a POSIX terminal (commands shown below assume Windows)

Install & run (local dev)
1. Clone the repo (already in your workspace):
   - c:\Users\darre\Documents\GitHub\financial-dashboard

2. Backend
   - Open terminal at project root:
     npm install
     npm run start
   - Backend listens on http://localhost:5000 by default and connects to mongodb://127.0.0.1:27017/financial_dashboard

3. Frontend
   - Open new terminal:
     cd frontend
     npm install
     npm start
   - Frontend runs at http://localhost:3000 (React dev server)

Quick sanity
- Ensure MongoDB is running (mongod).
- If you change backend routes or add files, restart the backend: npm run start
- For PowerShell JSON testing use Invoke-RestMethod as shown in the app admin docs.

What exists now (features)
- Models: Users, Accounts, Transactions, Categories.
- Category matching: matchType (contains, startsWith, regex) + pattern + priority.
- Auto-categorize on transaction create using rules.
- Admin endpoints:
  - GET /api/categories
  - POST /api/categories
  - PUT /api/categories/:id
  - DELETE /api/categories/:id
  - POST /api/admin/assign-category-by-pattern (preview/apply)
  - POST /api/admin/assign-category-by-description (apply by exact description)
  - POST /api/admin/retag-transactions (apply rules to existing transactions)
  - POST /api/admin/create-category-from-descriptions (build regex from selected descriptions)
- Utility endpoints:
  - GET /api/transactions/uncategorized?mode=uncategorized|sq|both
  - GET /api/transactions/conflicts
  - PUT /api/transactions/:id (update category/description/amount/type)
  - GET /api/reports/category-summary?userId=&start=&end=&type=expense|income
  - GET /api/reports/description-summary
- Frontend admin/UI:
  - Admin → Categories (manage rules, preview & apply patterns)
  - Admin → Uncategorized (list transactions without category + apply to all by description)
  - Admin → Conflicts (transactions matching multiple rules; resolve and apply to all)
  - Admin → Mappings (review normalized descriptions, group and create category rules)
  - Dashboard: Category summary component (period selection: month, quarter, year, all, custom) with chart + table

Important safety notes
- No authentication in current local dev: avoid exposing to internet.
- Passwords/plaintext storage must be improved — treat current setup as dev only.
- Bulk operations (updateMany) are destructive; backup DB before running large applies:
  - mongodump --db financial_dashboard --out C:\path\to\backup

Suggested roadmap (prioritised)
1. Security & auth (high)
   - Add user authentication (JWT / sessions), password hashing (bcrypt), role-based admin access.
   - Protect admin endpoints and frontend routes.
2. Backup / restore & audit (high)
   - Add database backup/restore UI and an admin audit log (store previous category values for undo).
3. Improve categorisation (high → medium)
   - Add match testing UI, whole-word / case-sensitive options and match preview diffs.
   - Add rule conflict detection and automatic priority suggestions.
   - Add "learned" categorisation: incremental supervised learning (user-labeled examples → ML classifier) with confidence score and human review queue for low-confidence items.
4. UX / UI (medium)
   - Modernise UI: responsive design, improved forms, modals, inline editing, pagination for big lists.
   - Theming & user customization (colours, layout).
5. Bulk workflow & safety (medium)
   - Bulk undo for pattern-based changes (store previous category values).
   - Dry-run / staged apply flows with CSV export of proposed updates.
6. Reporting & exports (medium)
   - More reports (income vs expense, cashflow, trend analysis), CSV/XLSX exports and scheduled reports.
7. Data quality & enrichment (low → medium)
   - Merchant name normalization, fuzzy grouping, clustering to suggest groupings.
   - Integrations: bank import adapters, OAuth for providers.
8. Devops & tests (medium)
   - Add unit/integration tests, CI pipeline, Docker compose for local reproducible dev environment.

How to contribute & iterate
- Work in feature branches.
- Add tests for new backend endpoints.
- Run local MongoDB or provide MONGO_URI via env var.
- Keep backups before bulk operations.

Files / paths of interest
- backend/index.js — main server & API routes (categories, transactions, admin endpoints)
- frontend/src/pages/AdminCategories.js — category CRUD + pattern preview/apply
- frontend/src/pages/UncategorizedTransactions.js — review uncategorized transactions
- frontend/src/pages/AdminConflicts.js — review/resolve conflicts
- frontend/src/pages/AdminMappings.js — description summary → create regex rules
- frontend/src/components/CategorySummary.js — dashboard summary & chart
