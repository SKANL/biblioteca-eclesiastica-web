# Biblioteca Virtual Eclesiástica (web)

Front-end PWA for the **BUSCAR → LEER → CITAR** flow: search the catalogue,
read the full page of a passage, and generate a bibliographic citation.

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**. Vercel-ready.

## Requirements

- Node.js 20.9+ to run the app (built and verified on Node 24 / npm 11);
  `npm test` needs **Node >= 22.18** (direct `.ts` imports)
- The Python API running locally (see below)

## Configuration

The app talks to the API through a single environment variable, read at build
time (it is public by design, it is only an API base URL):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

- Local: copy `.env.example` to `.env.local`.
- Vercel: add `NEXT_PUBLIC_API_BASE_URL` in **Project Settings → Environment
  Variables**, pointing at the deployed API. The API must allow the PWA origin
  (`http://localhost:3010` locally) via its `CORS_ORIGINS` setting; the API
  default is being changed to include 3010 in the API repo. Only "Copiar cita"
  (`CitePanel`) calls the API from the browser; all other data is fetched
  server-side.

### Editor login (optional)

Reading is public. Editors sign in with Google (Auth.js v5, JWT session, no DB).
Variables (see `.env.example`): `AUTH_SECRET` (PWA session cookie; `npx auth
secret`), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `API_AUTH_SECRET` (must equal
the API's `AUTH_SECRET`), optional `API_BASE_URL`. Without them the "Ingresar"
button is hidden. For `next start` on localhost also set `AUTH_TRUST_HOST=true`.

Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web):

- Authorized redirect URIs: `http://localhost:3010/api/auth/callback/google`
  and `https://<your-app>.vercel.app/api/auth/callback/google`.

The server mints a 5-minute HS256 token per API call (`lib/server/api.ts`); it
never reaches the browser. Roles come from the API (`GET /api/v1/yo`); the
"Editor" link and `/editor` require `editor` or `admin`.

Google accounts with an unverified email are refused at sign-in.

### Upload flow (`/editor/subir`)

Editors scan (camera) or pick files, review/reorder pages and fill the metadata.
The browser computes each file's sha256 (whole file in memory; `crypto.subtle`
has no streaming digest), a Server Action asks the API for presigned PUT URLs
(`POST /api/v1/uploads`), the browser PUTs each file **directly to the bucket**
(XHR progress, 3 attempts with jittered backoff, cancel), then a Server Action
calls `POST /uploads/{id}/completar` and the editor lands on
`/editor/trabajos/{id}`, which polls the job (1 s → 10 s, paused while the tab
is hidden). Same bytes again → "Este libro ya existe".

**Bucket CORS is required**: the bucket must accept `PUT` from the PWA origin,
otherwise the browser blocks the upload. Cloudflare R2 (bucket → Settings →
CORS policy):

```json
[
  {
    "AllowedOrigins": ["http://localhost:3010", "https://<your-app>.vercel.app"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

`GET` is needed so page images load from the bucket. Local SeaweedFS (the API's docker compose, `:9000`) already answers the
preflight for `http://localhost:3010`; nothing to configure.

## Run

Start the API (from the API repository, `C:\code\pipeline-OCR`):

```bash
uv run uvicorn app.main:app --port 8000
```

Then, in this folder:

```bash
npm install
npm run dev -- -p 3010   # http://localhost:3010
```

## Scripts

| Script              | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Development server                          |
| `npm run build`     | Production build (0 TypeScript errors)      |
| `npm run start`     | Serve the production build                  |
| `npm run lint`      | ESLint (flat config)                        |
| `npm run typecheck` | `tsc --noEmit`                              |
| `npm run icons`     | Regenerate the PWA/app icons (no deps)      |
| `npm test`          | Reader helper regressions in `tests/tools/` |

Deploying (Vercel + Render + Atlas + R2 + Google OAuth): see the API repo's
`docs/DESPLIEGUE.md`. Real inputs live only in `../pipeline-OCR/tests/fixtures/`; this repository owns
the four Node/browser harnesses in `tests/tools/`. See its [index](tests/tools/README.md).
Original Office sources are archived in `../pipeline-OCR/docs/source/`.
The API runs on 8000 and the web on 3010. Do not rebuild the live `.next` while
production is serving; validate with lint/typecheck (`--incremental false`) or
an isolated build copy. Moving input fixtures does not require DB/media regeneration.

## API endpoints used

| UI need            | Endpoint                                                        |
| ------------------ | -------------------------------------------------------------- |
| Filters            | `GET /api/v1/facets`                                            |
| Search             | `GET /api/v1/search?q=&genero=&autor=&limit=&offset=`          |
| Book list          | `GET /api/v1/books?genero=&autor=&limit=&offset=`               |
| Book metadata      | `GET /api/v1/books/{libro_id}`                                  |
| Book pages         | `GET /api/v1/books/{libro_id}/paginas?limit=&offset=`           |
| Page text + nav    | `GET /api/v1/ref/{libro_id}/pagina/{numero}?q=` (`q` optional: recomputes matches) |
| Citation           | `GET /api/v1/cite/{libro_id}/pagina/{numero}?estilo=apa\|chicago\|mla` |
| Page image / media | `imagen_url` from the API: absolute bucket URL (R2/SeaweedFS, public or presigned) or, with local storage, `{API_BASE}/media/...` |
| Uploads / jobs     | `POST /api/v1/uploads`, `POST /api/v1/uploads/{id}/completar`, `GET /api/v1/trabajos/{id}` (Server Actions) |
| Editor / admin     | `GET /api/v1/yo`, `PATCH`/`DELETE /api/v1/books/{id}`, `POST /api/v1/books/{id}/reprocesar`, `/api/v1/editores` |

## PWA notes

- `app/manifest.ts` provides name, icons, theme color and `display: standalone`.
- Icons are generated by `scripts/generate-icons.mjs` (`app/icon.png`, `app/apple-icon.png`,
  192, 512 and maskable 512 in `public/`) with no image library. `app/icon.png`
  doubles as the browser icon; no separate favicon is generated.
- `public/sw.js` is a hand-written service worker, registered only in production
  (`components/ServiceWorker.tsx`). It precaches an offline shell (`/offline`) and
  keeps recently read pages and a capped image cache; it never caches POSTs,
  `/api/*`, `/editor*` or RSC payloads, and signed-in pages are dropped on sign-out.
  Bump `VERSION` in `public/sw.js` whenever the strategies change.

## Keyboard

- Search: `Enter` submits the focused field.
- Reader: `←` / `→` go to the previous / next page.
