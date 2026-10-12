"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { completarSubida, crearSubida, type ArchivoDeclarado } from "@/app/(sitio)/editor/actions";
import JobStatus from "@/components/JobStatus";
import { btnOutline, btnPrimary, card, inputBase, labelBase } from "@/lib/ui";
import {
  backoffDelay,
  moveItem,
  pairUploads,
  sha256Hex,
  shouldRetry,
  validateMetadata,
  type MetadataInput,
  type PresignedFile,
} from "@/lib/upload";
import { defaultTitle, splitsIntoBooks } from "@/lib/upload-steps";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf,text/plain";
const MAX_ATTEMPTS = 3;

interface Item {
  key: string;
  file: File;
  preview: string | null; // object URL, revoked on removal/unmount
  titulo: string; // used when each document becomes its own book
}

/** One progress card per book created by this upload. */
interface Tracked {
  id: string;
  titulo: string;
  libro_id: string;
  existente: boolean;
  upload?: number; // 0..1 while in the browser; undefined once processing started
  error?: string;
}

class Aborted extends Error {}

/** PUT with upload progress (XHR: fetch has no upload progress events). Resolves the HTTP status (0 = network). */
function put(target: PresignedFile, file: File, onProgress: (loaded: number) => void, signal: AbortSignal) {
  return new Promise<number>((resolve, reject) => {
    if (signal.aborted) return reject(new Aborted());
    const xhr = new XMLHttpRequest();
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.open(target.metodo, target.url);
    for (const [k, v] of Object.entries(target.encabezados)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => resolve(0);
    xhr.onabort = () => reject(new Aborted());
    xhr.send(file);
  });
}

/** Backoff wait that Cancel interrupts. */
function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Aborted());
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), reject(new Aborted())), { once: true });
  });
}

export default function UploadForm() {
  const [items, setItems] = useState<Item[]>([]);
  const [meta, setMeta] = useState<MetadataInput>({});
  const [errors, setErrors] = useState<Partial<Record<keyof MetadataInput, string>>>({});
  const [titleErrors, setTitleErrors] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tracked, setTracked] = useState<Tracked[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Revoke every preview URL when the component goes away.
  useEffect(() => () => itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), []);

  const types = items.map((i) => i.file.type);
  const documents = splitsIntoBooks(types);
  const mixed = items.length > 0 && !documents && types.some((t) => !t.startsWith("image/"));

  function addFiles(list: FileList | null) {
    if (!list) return;
    const added = Array.from(list).map((file) => ({
      key: crypto.randomUUID(),
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      titulo: defaultTitle(file.name),
    }));
    const bad = added.filter((i) => !ACCEPT.split(",").includes(i.file.type));
    bad.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    setError(bad.length ? `Formato no admitido: ${bad.map((i) => i.file.name).join(", ")}.` : null);
    setItems((prev) => [...prev, ...added.filter((i) => !bad.includes(i))]);
  }

  function remove(index: number) {
    const item = items[index];
    if (item.preview) URL.revokeObjectURL(item.preview);
    setItems(items.filter((_, i) => i !== index));
    setStatus(`${item.file.name} quitado.`);
  }

  function move(index: number, to: number) {
    setItems(moveItem(items, index, to));
    setStatus(`${items[index].file.name} movido a la posición ${to + 1}.`);
  }

  const patch = (id: string, change: Partial<Tracked>) =>
    setTracked((all) => all.map((t) => (t.id === id ? { ...t, ...change } : t)));

  /** Uploads one file with retries; `onLoaded` gets the bytes sent so far. */
  async function upload(target: PresignedFile, item: Item, signal: AbortSignal, onLoaded: (bytes: number) => void) {
    let last = 0;
    for (let attempt = 0; ; attempt++) {
      const code = await put(target, item.file, (loaded) => {
        const now = Date.now();
        if (now - last < 250) return; // ponytail: throttle progress renders to ~4/s
        last = now;
        onLoaded(loaded);
      }, signal);
      if (code >= 200 && code < 300) return onLoaded(item.file.size);
      if (!shouldRetry(code) || attempt + 1 >= MAX_ATTEMPTS) {
        throw new Error(`No se pudo subir ${item.file.name}. Revisa tu conexión e inténtalo de nuevo.`);
      }
      setStatus(`Reintentando ${item.file.name} (${attempt + 2}/${MAX_ATTEMPTS})…`);
      await sleep(backoffDelay(attempt), signal);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!items.length) return setError("Agrega al menos un archivo.");
    if (mixed) return setError("No mezcles fotos con PDF o textos: súbelos por separado.");
    // ponytail: shared fields reuse validateMetadata; with documents each title is checked per file.
    const { errors: errs, metadatos } = validateMetadata(documents ? { ...meta, titulo: "-" } : meta);
    const missing = documents ? Object.fromEntries(items.filter((i) => !i.titulo.trim()).map((i) => [i.key, true])) : {};
    setErrors(errs);
    setTitleErrors(missing);
    if (Object.keys(errs).length || Object.keys(missing).length) return setError("Revisa los datos del libro.");
    if (documents) delete metadatos.titulo;
    setBusy(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    const check = () => {
      if (signal.aborted) throw new Aborted();
    };
    const sent = items;
    try {
      setStatus("Revisando los archivos…");
      const archivos: ArchivoDeclarado[] = [];
      for (const { file, titulo } of sent) {
        archivos.push({
          nombre: file.name,
          tipo_contenido: file.type,
          tamano: file.size,
          sha256: await sha256Hex(file),
          ...(documents ? { titulo: titulo.trim() } : {}),
        });
      }
      setStatus("Preparando la subida…");
      check();
      const created = await crearSubida(archivos, metadatos);
      check();
      if (!created.ok) throw new Error(created.error);
      const jobs = created.data.trabajos;
      setTracked((prev) => [
        ...jobs.map((j) => ({ id: j.id, titulo: j.titulo, libro_id: j.libro_id, existente: j.existente, upload: j.existente ? undefined : 0 })),
        ...prev.filter((p) => !jobs.some((j) => j.id === p.id)),
      ]);
      setStatus(jobs.length > 1 ? `Subiendo ${jobs.length} libros…` : "Subiendo…");
      let free = sent;
      let failures = 0;
      for (const [index, job] of jobs.entries()) {
        if (job.existente) continue;
        // Documents: the API returns one job per file, in the order sent, so pair by
        // position (names can repeat across folders). Photos: one job, pair by name.
        const pairs: [(typeof job.archivos)[number], (typeof sent)[number]][] =
          documents && jobs.length === sent.length
            ? [[job.archivos[0], sent[index]]]
            : pairUploads(job.archivos, free, (i) => i.file.name);
        free = free.filter((i) => !pairs.some(([, p]) => p === i));
        const total = pairs.reduce((n, [, i]) => n + i.file.size, 0) || 1;
        const loaded: number[] = pairs.map(() => 0);
        try {
          for (const [n, [target, item]] of pairs.entries()) {
            await upload(target, item, signal, (bytes) => {
              loaded[n] = bytes;
              patch(job.id, { upload: loaded.reduce((a, b) => a + b, 0) / total });
            });
          }
          check();
          const done = await completarSubida(job.id);
          if (!done.ok) throw new Error(done.error);
          patch(job.id, { upload: undefined });
        } catch (err) {
          if (err instanceof Aborted) throw err;
          failures += 1;
          patch(job.id, { error: err instanceof Error ? err.message : String(err) });
        }
      }
      if (failures === 0) {
        setItems([]); // keep the selection when something failed, so it can be retried
        setMeta({});
        setStatus("Archivos enviados. Puedes seguir el avance aquí o en Mis subidas.");
      } else {
        setStatus(
          failures === jobs.length
            ? "No se pudo enviar ningún archivo. Revisa los avisos y vuelve a intentarlo."
            : `${failures} de ${jobs.length} archivos no se enviaron. Revisa los avisos.`,
        );
      }
    } catch (err) {
      if (err instanceof Aborted) {
        setTracked((all) => all.map((t) => (t.upload !== undefined && !t.error ? { ...t, error: "subida cancelada." } : t)));
      }
      setError(err instanceof Aborted ? "Subida cancelada." : err instanceof Error ? err.message : String(err));
      setStatus("");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  const field = (name: keyof MetadataInput, label: string, extra: Record<string, string> = {}) => (
    <div>
      <label htmlFor={`m-${name}`} className={labelBase}>
        {label}
      </label>
      <input
        id={`m-${name}`}
        className={`${inputBase} mt-1`}
        value={meta[name] ?? ""}
        onChange={(e) => setMeta({ ...meta, [name]: e.target.value })}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `m-${name}-err` : undefined}
        disabled={busy}
        {...extra}
      />
      {errors[name] && (
        <p id={`m-${name}-err`} className="mt-1 text-sm text-red-700">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="mt-6 space-y-8">
      {tracked.length > 0 && (
        <section aria-labelledby="avance" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="avance" className="font-serif text-xl text-ink">Avance</h2>
            <Link href="/editor/subidas" className="text-sm underline">Ver Mis subidas</Link>
          </div>
          <ul className="space-y-3">
            {tracked.map((t) => (
              <li key={t.id} className={`${card} p-4`}>
                {t.existente ? (
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{t.titulo}</span>: este libro ya estaba en la biblioteca.{" "}
                    <Link className="underline" href={`/libro/${encodeURIComponent(t.libro_id)}`}>Abrir libro</Link>
                  </p>
                ) : t.error ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-ink">{t.titulo}</p>
                    <p role="alert" className="text-sm text-red-700">Falló al subir: {t.error}</p>
                  </div>
                ) : (
                  <JobStatus id={t.id} titulo={t.titulo} upload={t.upload} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <fieldset disabled={busy} className="flex flex-wrap gap-3">
          <legend className="sr-only">Archivos</legend>
          <label className={`${btnOutline} cursor-pointer focus-within:ring-2 focus-within:ring-accent`}>
            Escanear con la cámara
            <input type="file" accept={ACCEPT} capture="environment" multiple className="sr-only"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </label>
          <label className={`${btnOutline} cursor-pointer focus-within:ring-2 focus-within:ring-accent`}>
            Elegir archivos
            <input type="file" accept={ACCEPT} multiple className="sr-only"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </label>
        </fieldset>
        <p className="text-sm text-ink-soft">
          {items.length === 0
            ? "Elige uno o varios PDF o textos, o varias fotos (JPEG, PNG o WebP) de las páginas."
            : documents
              ? "Cada PDF se guarda como un libro distinto."
              : mixed
                ? "No mezcles fotos con PDF o textos: súbelos por separado."
                : "Las fotos se unen en un solo libro, en este orden."}
        </p>

        {items.length > 0 && (
          <ol className="grid gap-3 sm:grid-cols-2" aria-label={documents ? "Libros" : "Páginas en orden"}>
            {items.map((item, i) => (
              <li key={item.key} className={`${card} flex items-center gap-3 p-3`}>
                {item.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL, not optimizable
                  <img src={item.preview} alt={`Página ${i + 1}`} className="h-20 w-16 rounded object-cover" />
                ) : (
                  <span className="flex h-20 w-16 items-center justify-center rounded border border-line text-xs text-ink-soft">
                    {item.file.type === "application/pdf" ? "PDF" : "TXT"}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{i + 1}. {item.file.name}</p>
                  {documents && (
                    <div className="mt-1">
                      <label htmlFor={`t-${item.key}`} className={labelBase}>Título</label>
                      <input
                        id={`t-${item.key}`}
                        className={`${inputBase} mt-1`}
                        value={item.titulo}
                        required
                        disabled={busy}
                        aria-invalid={Boolean(titleErrors[item.key])}
                        aria-describedby={titleErrors[item.key] ? `t-${item.key}-err` : undefined}
                        onChange={(e) =>
                          setItems(items.map((it) => (it.key === item.key ? { ...it, titulo: e.target.value } : it)))
                        }
                      />
                      {titleErrors[item.key] && (
                        <p id={`t-${item.key}-err`} className="mt-1 text-sm text-red-700">El título es obligatorio.</p>
                      )}
                    </div>
                  )}
                  <div className="mt-1 flex gap-1">
                    {!documents && (
                      <>
                        <button type="button" className={btnOutline} disabled={busy || i === 0}
                          onClick={() => move(i, i - 1)} aria-label={`Subir ${item.file.name} una posición`}>↑</button>
                        <button type="button" className={btnOutline} disabled={busy || i === items.length - 1}
                          onClick={() => move(i, i + 1)} aria-label={`Bajar ${item.file.name} una posición`}>↓</button>
                      </>
                    )}
                    <button type="button" className={btnOutline} disabled={busy}
                      onClick={() => remove(i)} aria-label={`Quitar ${item.file.name}`}>Quitar</button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {!documents && field("titulo", "Título (obligatorio)", { required: "" })}
          {field("autor", "Autor")}
          {field("genero", "Género")}
          {field("anio", "Año de publicación", { inputMode: "numeric" })}
        </div>
        {documents && items.length > 1 && (
          <p className="text-sm text-ink-soft">Autor, género y año se aplican a todos los libros.</p>
        )}

        <p role="status" aria-live="polite" className="text-sm text-ink-soft">{status}</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" className={btnPrimary} disabled={busy || mixed}>
            {documents && items.length > 1 ? `Subir ${items.length} libros` : "Subir libro"}
          </button>
          {busy && <button type="button" className={btnOutline} onClick={() => abortRef.current?.abort()}>Cancelar</button>}
        </div>
      </form>
    </div>
  );
}
