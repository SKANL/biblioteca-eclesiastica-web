"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { btnOutline } from "@/lib/ui";
import { imageGeometry, retryImageSource } from "@/lib/reader-image";

interface ReaderImageProps {
  src: string;
  alt: string;
  width?: number | null;
  height?: number | null;
  fullPage?: boolean;
  children?: ReactNode;
  onReady?: () => void;
}

export default function ReaderImage(props: ReaderImageProps) {
  // Source identity resets failures on soft navigation, without an effect.
  return <ImageAttempt key={props.src} {...props} />;
}

function ImageAttempt({ src, alt, width, height, fullPage, children, onReady }: ReaderImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const imageSrc = retryImageSource(src, attempt);
  const geometry = imageGeometry(width, height);
  const reconcileImage = useCallback((image: HTMLImageElement | null) => {
    // Native load/error may finish before hydration attaches the event handlers.
    if (image?.complete) setStatus(image.naturalWidth > 0 ? "loaded" : "error");
  }, []);

  useEffect(() => {
    // Notify after React commits the loaded image and its highlight children.
    if (status === "loaded") onReady?.();
  }, [status, onReady]);

  return (
    <div className="relative max-w-full" style={status === "loaded" ? undefined : {
      aspectRatio: geometry.ratio, width: geometry.exact && !fullPage ? `min(100%, ${width}px)` : "100%",
    }}>
      {status === "error" ? (
        <div className="rounded-md border border-dashed border-line-strong bg-paper-raised p-4 text-sm text-ink-soft">
          <p role="status">No se pudo cargar la imagen.</p>
          <button type="button" className={`${btnOutline} mt-3`} onClick={() => {
            setStatus("loading");
            setAttempt((value) => value + 1);
          }}>Reintentar imagen</button>
        </div>
      ) : (
        <>
          {status === "loading" && <p role="status" className="absolute left-2 top-2 bg-paper px-2 text-sm text-ink-soft">Cargando imagen…{!geometry.exact && " Espacio reservado aproximado; dimensiones originales no disponibles."}</p>}
          {/* Images use the API-configured media host. Intrinsic dimensions reserve space. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={reconcileImage} key={attempt} src={imageSrc} alt={alt}
            width={geometry.exact ? width! : undefined} height={geometry.exact ? height! : undefined}
            loading={fullPage ? "eager" : "lazy"}
            onLoad={() => setStatus("loaded")} onError={() => setStatus("error")}
            className={`block h-auto max-w-full rounded-md bg-white ${fullPage ? "w-full outline outline-1 outline-line" : "border border-line"}`}
          />
          {status === "loaded" && children}
        </>
      )}
    </div>
  );
}
