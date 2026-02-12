# ParsePort — Offer-to-Order Pipeline


**Vendor email / Excel price sheet → AI parses offers → human review → convert to order → track shipment → analytics dashboard.**

---

## What this project does

- **Offer parsing from email/spreadsheets** — Paste vendor emails or upload `.eml` / `.txt` / `.xlsx`; AI extracts vendor, terms, line items, pricing, MOQs, and lead time into structured data.
- **Order + shipment visibility** — Pipeline board (New → Negotiating → Accepted → Ordered → In Transit → Delivered), shipment timeline, and Leaflet map with last known location.
- **Multi-tenant security with RLS (Row Level Security)** — All data scoped by `org_id`; roles `admin`, `broker`, and `viewer`; only admin/broker create or convert offers; storage policies restrict documents to the org.
- **Edge Functions (Deno/TypeScript) business logic** — Parsing, Excel import, offer-to-order conversion, mock shipment webhook, and KPI snapshot.
- **Storage-backed documents + signed links** — Original vendor emails and spreadsheets stored in a `documents` bucket; access via signed URLs and RLS.
- **Analytics for revenue/margin/vendor performance** — Recharts dashboard: total revenue, conversion rate, avg lead time, top vendors by revenue and pie share.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           React (Vite + React Router)                         │
│  Offer Inbox │ Offer Review │ Pipeline │ Shipment View │ Analytics            │
└───────────────────────────────┬───────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│ Supabase Auth │     │ PostgREST       │     │ Edge Functions       │
│ (magic link)  │     │ (tables/views)  │     │ (Deno/TypeScript)    │
└───────────────┘     └─────────────────┘     │ • parse-offer-email  │
        │                       │              │ • import-excel-offer │
        │                       │              │ • convert-offer-    │
        │                       │              │   to-order          │
        │                       │              │ • shipment-webhook- │
        │                       │              │   mock              │
        │                       │              │ • kpi-snapshot      │
        │                       │              └──────────┬──────────┘
        │                       │                         │
        │                       │                         ▼
        │                       │              ┌─────────────────────┐
        │                       │              │ OpenAI API           │
        │                       │              │ (structured extract) │
        │                       │              └─────────────────────┘
        │                       │
        │                       ▼
        │              ┌─────────────────────┐
        │              │ Storage (documents) │
        │              │ → signed URLs       │
        │              └─────────────────────┘
        │
        └──────────────► PostgreSQL + RLS (org_id isolation)
```

---

## Tech stack

| Layer    | Tech                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Frontend | Vite, React 18, TypeScript, React Router, TanStack Query, Tailwind CSS, Recharts, Leaflet / react-leaflet |
| Backend  | Supabase (Auth, PostgreSQL, Storage, Edge Functions)                                                      |
| AI       | OpenAI API (GPT-4o-mini) for offer parsing                                                                |
| Excel    | SheetJS (Edge Function) for price sheet import                                                            |

---

## Getting started

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Run migrations (SQL Editor or CLI):
   - `supabase/migrations/20250101000001_initial_schema.sql`
   - `supabase/migrations/20250101000002_rls.sql`
   - `supabase/migrations/20250101000003_storage.sql`
   - `supabase/migrations/20250101000004_auth_profiles.sql`
3. Create the `documents` storage bucket if not created by migration (Dashboard → Storage).
4. Set Edge Function secrets: `OPENAI_API_KEY` (for `parse-offer-email`).
5. Deploy Edge Functions (see below).

### 2. Frontend

```bash
cp .env.example .env
# Edit .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

Open `http://localhost:5173`. Sign in with a magic link; the auth trigger creates a profile and default org and adds you as `admin`.

### 3. Demo script (5 minutes)

1. **Log in** → land on Offer Inbox.
2. **Paste** a messy vendor email (pricing + terms) → click **Parse with AI**.
3. **Review** results on Offer Review, fix one field if needed, click **Approve → Negotiating**, then **Mark as Accepted**.
4. **Convert to order** → order and shipment are created; offer moves to “Ordered”.
5. **Trigger mock webhook** (e.g. `curl -X POST https://your-project.supabase.co/functions/v1/shipment-webhook-mock -H "Authorization: Bearer ANON_KEY" -H "Content-Type: application/json" -d '{}'`) → shipment timeline and map update.
6. **Open Analytics** → see revenue, top vendor chart, conversion rate, lead time.

---

## Supabase details

### Tables (minimum viable)

- **orgs**, **profiles**, **org_members** — multi-tenant and roles.
- **vendors**, **customers** — CRM entities.
- **offers**, **offer_items** — parsed offers and line items.
- **orders**, **order_items** — orders created from offers.
- **shipments**, **shipment_events** — tracking and timeline.
- **documents** — metadata for files in Storage.

### RLS

- All tables: `SELECT` only where `org_id = auth.user_org_id()`.
- Writes: only for `auth.user_org_role()` in `('admin', 'broker')`.
- Storage: objects under path `{org_id}/...`; only that org’s members can read/write.

### Edge Functions

| Function                 | Purpose                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `parse-offer-email`      | Fetches offer by `offer_id`, sends `raw_content` to OpenAI, returns normalized JSON; updates `offers.parsed_json` and `offer_items`. |
| `import-excel-offer`     | Downloads file from Storage, parses with SheetJS, column matcher, upserts `offer_items` and `offers.parsed_json`.                    |
| `convert-offer-to-order` | Creates `order` + `order_items` from offer (transactional), creates `shipment`, sets offer status to `ordered`.                      |
| `shipment-webhook-mock`  | Appends a shipment event and updates shipment status/location for demo (no real carrier).                                            |
| `kpi-snapshot`           | Returns aggregated metrics: total revenue, conversion rate, avg lead time, top vendors.                                              |

### Storage

- Bucket: `documents`. Used for vendor emails, spreadsheets, PDFs. Signed URLs for download; RLS restricts by `org_id` in path.

---

## Deploy Edge Functions

```bash
# Supabase CLI
supabase link --project-ref YOUR_REF
supabase functions deploy parse-offer-email --no-verify-jwt
supabase functions deploy import-excel-offer --no-verify-jwt
supabase functions deploy convert-offer-to-order --no-verify-jwt
supabase functions deploy shipment-webhook-mock --no-verify-jwt
supabase functions deploy kpi-snapshot --no-verify-jwt
```

Set `OPENAI_API_KEY` in Dashboard → Edge Functions → Secrets for `parse-offer-email`.

---

## License

MIT.
