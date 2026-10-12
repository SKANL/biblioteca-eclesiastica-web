# AGENTS.md — PWA (biblioteca-eclesiastica-web)

Instrucciones para agentes que trabajan en **este** repositorio (front-end PWA de
la Biblioteca Virtual Eclesiástica).

## Qué es

PWA **search-first** del flujo **BUSCAR → LEER → CITAR**. Consume la API del repo
hermano `../pipeline-OCR` y muestra el catálogo como algo buscable, legible y
citable.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4.
**Sin librerías de UI extra.**

## Comandos

```powershell
npm install
npm run dev      # desarrollo
npm run build    # build de producción
npm run start    # sirve el build
npm run lint
npm test         # regresiones helper en tests/tools/
npm run typecheck -- --incremental false
```

- ⚠️ **El puerto 3000 puede estar ocupado** en esta máquina: usar
  `npx next start -p 3010` (o `npm run dev -- -p 3010`).
- ⚠️ **Nunca rebuildear con `next start` corriendo**: quedan chunks viejos → 404 →
  la UI se rompe. Rebuildear y **reiniciar** el server.
- ⚠️ `npm run build` debe ejecutarse con el **workdir de esta carpeta** (si no,
  falla).

## Configuración

`NEXT_PUBLIC_API_BASE_URL` (`.env.local` en dev = `http://localhost:8000`; en
Vercel se define en Project Settings → Environment Variables). La **API debe estar
corriendo** para que la app tenga datos.

Login de editores (opcional): `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
`AUTH_GOOGLE_SECRET`, `API_AUTH_SECRET` (= `AUTH_SECRET` del API), `API_BASE_URL`.
`auth.ts` (raíz) configura Auth.js v5; `lib/server/api.ts` (server-only) firma
el token HS256 y llama al API (`apiFetchAs`, `getMe`); `apiFetchAsSignedIn` (solo exige sesión; el rol lo valida el API) en
`auth.ts` para Server Actions. Sin env, el login se oculta. `/editor` exige rol
`editor`/`admin`. Tests con `--conditions=react-server` (por `server-only`).

## Estructura

- `tests/tools/` — cuatro harnesses Node/browser; ejecutar en este repo para
  resolver npm. Solo `scripts/generate-icons.mjs` es operacional.
- Insumos reales canónicos en `../pipeline-OCR/tests/fixtures/`; Office original
  en `../pipeline-OCR/docs/source/`. No duplicar inputs en la PWA.
- API 8000 / PWA 3010. No borrar ni reconstruir `.next` mientras sirve producción.
- El reset local ya está activo (3 libros, 43 páginas). Mover fixtures no cambia
  DB ni media URLs; conservar `_media/` del API y toda la evidencia histórica.

- `app/layout.tsx` — root (fuentes `next/font`, skip-link).
- `app/(sitio)/layout.tsx` — **route group**: monta el header y el footer **una
  sola vez** para todas las páginas (no repetirlos en cada página).
- `app/(sitio)/` — `page.tsx` (buscador), `buscar/`, `biblioteca/`,
  `libro/[libroId]/` (`pagina/[numero]/`). Los route groups **no cambian las URLs**.
- `app/not-found.tsx` y `app/error.tsx` — fuera del grupo.
- `components/` — `FilterForm` (filtros compartidos), `ResultCard`,
  `ReaderToolbar`, `ReaderImage`, `CitePanel`, `BookCard`, `Pagination`, `EmptyState`,
  `ErrorNotice`, `MessagePage`, `SiteHeader`, `SiteFooter`.
- `lib/api.ts` cliente tipado · `lib/types.ts` modelos · `lib/utils.ts`
  (`snippetToSafeHtml`, `countLabel`, …; `highlightText` y `toParagraphs` existen pero no se usan) · `lib/ui.ts` **tokens
  de clases**.

## Convenciones (IMPORTANTE)

- **No repetir clases de Tailwind**: usar los tokens de `lib/ui.ts` (`btnPrimary`,
  `btnPrimarySm`, `btnOutline`, `inputBase`, `labelBase`, `card`, spinners…).
- **No repetir formularios/estructuras**: `FilterForm` (búsqueda y catálogo) y
  `MessagePage` (no encontrado / error) son las fuentes únicas.
- Los datos se piden en Server Components con `fetch(..., { cache: "no-store" })`;
  la única excepción es `CitePanel` (client), que llama a la API desde el
  navegador (requiere CORS del origen de la PWA en el API).
- Snippets de búsqueda: `snippetToSafeHtml` (escapa todo y re-habilita **solo**
  `<mark>`). Resaltado en el lector: `markRanges` + `literalRanges`
  (`lib/reader-matches.ts`) desde `libro/[libroId]/pagina/[numero]/page.tsx`.
- Estados de carga en `loading.tsx`; vacío/error con `EmptyState` / `ErrorNotice`.
- **Nada de UI decorativa**: cada elemento debe tener una función real y funcionar.

## Gotchas

- La verificación viaja por URL: `?ver=imagen`, `?q=` y `?coincidencia=<n>`.
  La API recalcula las coincidencias de cada página; no reutilizar un bloque
  antiguo para una consulta. `?bloque=<n>` permanece como respaldo sin `q`.
  Usar offsets Unicode del texto original y distinguir glifos nativos, bloque
  aproximado y falta de ubicación; las frases pueden tener varios rectángulos.
- El bloque `<-- BEGIN:nextjs-agent-rules -->` de abajo lo **autogenera `next dev`**;
  no borrarlo (Next lo vuelve a crear).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
