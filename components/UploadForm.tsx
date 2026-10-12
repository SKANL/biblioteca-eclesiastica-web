"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { completarSubida, crearSubida } from "@/app/(sitio)/editor/actions";
import { btnOutline, btnPrimary, card, inputBase, labelBase } from "@/lib/ui";
import {
  backoffDelay,
  moveItem,
  sha256Hex,
  shouldRetry,
  validateMetadata,
  type MetadataInput,
  type PresignedFile,
} from "@/lib/upload";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf,text/plain";
const MAX_ATTEMPTS = 3;

interface Item {
  key: string;
  file: File;
  preview: string | null; // object URL, revoked on removal/unmount
}

class Aborted extends Error {}

/** PUT with upload progress (XHR: fetch has no upload progress events). Resolves the HTTP status (0 = network). */
function put(target: PresignedFile, file: File, onProgress: (loaded: number) => void, xhrRef: { current: XMLHttpRequest | null }) {
  return new Promise<number>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open(target.metodo, target.url);
    for (const [k, v] of Object.entries(target.encabezados)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => resolve(0);
    xhr.onabort = () => reject(new Aborted());
    xhr.send(file);
  });
}

export default function UploadForm() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [meta, setMeta] = useState<MetadataInput>({});
  const [errors, setErrors] = useState<Partial<Record<keyof MetadataInput, string>>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ id: string; libro_id: string } | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const abortedRef = useRef(false);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Revoke every preview URL when the component goes away.
  useEffect(() => () => itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), []);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const added = Array.from(list).map((file) => ({
      key: crypto.randomUUID(),
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    const bad = added.filter((i) => !ACCEPT.split(",").includes(i.file.type));
    bad.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    setError(bad.length ? `Formato no admitido: ${bad.map((i) => i.file.name).join(", ")}.` : null);
    setItems((prev) => [...prev, ...added.filter((i) => !bad.includes(i))]);
    setExisting(null);
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

  async function upload(target: PresignedFile, item: Item) {
    let last = 0;
    for (let attempt = 0; ; attempt++) {
      if (abortedRef.current) throw new Aborted();
      const code = await put(target, item.file, (loaded) => {
        const now = Date.now();
        if (now - last < 250) return; // ponytail: throttle progress renders to ~4/s
        last = now;
        setProgress((p) => ({ ...p, [item.key]: loaded / item.file.size }));
      }, xhrRef);
      if (code >= 200 && code < 300) {
        setProgress((p) => ({ ...p, [item.key]: 1 }));
        return;
      }
      if (!shouldRetry(code) || attempt + 1 >= MAX_ATTEMPTS) {
        throw new Error(`No se pudo subir ${item.file.name} (${code || "sin conexión"}).`);
      }
      setStatus(`Reintentando ${item.file.name} (${attempt + 2}/${MAX_ATTEMPTS})…`);
      await new Promise((r) => setTimeout(r, backoffDelay(attempt)));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const { errors: errs, metadatos } = validateMetadata(meta);
    setErrors(errs);
    if (!items.length) return setError("Agrega al menos un archivo.");
    if (Object.keys(errs).length) return setError("Revisa los datos del libro.");
    setBusy(true);
    setError(null);
    setExisting(null);
    abortedRef.current = false;
    try {
      setStatus("Calculando huellas de los archivos…");
      const archivos = [];
      for (const { file } of items) {
        archivos.push({ nombre: file.name, tipo_contenido: file.type, tamano: file.size, sha256: await sha256Hex(file) });
      }
      setStatus("Preparando la subida…");
      const created = await crearSubida(archivos, metadatos);
      if (!created.ok) throw new Error(created.error);
      if (created.data.existente) {
        setExisting({ id: created.data.id, libro_id: created.data.libro_id });
        setStatus("Este libro ya existe.");
        return;
      }
      for (const [i, target] of created.data.archivos.entries()) {
        setStatus(`Subiendo ${i + 1} de ${items.length}…`);
        await upload(target, items[i]);
      }
      setStatus("Encolando el procesamiento…");
      const done = await completarSubida(created.data.id);
      if (!done.ok) throw new Error(done.error);
      router.push(`/editor/trabajos/${encodeURIComponent(done.data.trabajo_id)}`);
    } catch (err) {
      setError(err instanceof Aborted ? "Subida cancelada." : err instanceof Error ? err.message : String(err));
      setStatus("");
    } finally {
      setBusy(false);
      xhrRef.current = null;
    }
  }

  function abort() {
    abortedRef.current = true;
    xhrRef.current?.abort();
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
    <form onSubmit={onSubmit} className="mt-6 space-y-6" noValidate>
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
        Un PDF, un texto o varias fotos (JPEG, PNG o WebP) en el orden de las páginas. Los archivos se leen
        completos en memoria para calcular su huella.
      </p>

      {items.length > 0 && (
        <ol className="grid gap-3 sm:grid-cols-2" aria-label="Páginas en orden">
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
                {progress[item.key] !== undefined && (
                  <progress className="w-full" max={1} value={progress[item.key]} aria-label={`Progreso de ${item.file.name}`} />
                )}
                <div className="mt-1 flex gap-1">
                  <button type="button" className={btnOutline} disabled={busy || i === 0}
                    onClick={() => move(i, i - 1)} aria-label={`Subir ${item.file.name} una posición`}>↑</button>
                  <button type="button" className={btnOutline} disabled={busy || i === items.length - 1}
                    onClick={() => move(i, i + 1)} aria-label={`Bajar ${item.file.name} una posición`}>↓</button>
                  <button type="button" className={btnOutline} disabled={busy}
                    onClick={() => remove(i)} aria-label={`Quitar ${item.file.name}`}>Quitar</button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {field("titulo", "Título (obligatorio)", { required: "" })}
        {field("autor", "Autor")}
        {field("genero", "Género")}
        {field("anio", "Año de publicación", { inputMode: "numeric" })}
      </div>

      <p role="status" aria-live="polite" className="text-sm text-ink-soft">{status}</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {existing && (
        <p className="text-sm text-ink">
          Este libro ya existe.{" "}
          <Link className="underline" href={`/libro/${encodeURIComponent(existing.libro_id)}`}>Ver libro</Link>{" · "}
          <Link className="underline" href={`/editor/trabajos/${encodeURIComponent(existing.id)}`}>Ver estado del trabajo</Link>
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" className={btnPrimary} disabled={busy}>Subir libro</button>
        {busy && <button type="button" className={btnOutline} onClick={abort}>Cancelar</button>}
      </div>
    </form>
  );
}
