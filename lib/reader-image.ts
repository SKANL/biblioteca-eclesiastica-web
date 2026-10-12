export function imageGeometry(width?: number | null, height?: number | null) {
  const exact = Number.isFinite(width) && Number.isFinite(height) && width! > 0 && height! > 0;
  // Legacy records reserve an approximate portrait area, not inferred dimensions.
  return { exact, ratio: exact ? width! / height! : 3 / 4 };
}

export function validHighlight(box: number[] | null | undefined) {
  if (!box || box.length !== 4 || !box.every(Number.isFinite)) return null;
  const [x, y, width, height] = box;
  return x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 1 && y + height <= 1
    ? box : null;
}

export function targetIdentity(book: string, page: number, src: string | null,
  block: number | null, box: number[] | null, width: number | null, height: number | null) {
  return JSON.stringify([book, page, src, block, box, width, height]);
}

export function retryImageSource(src: string, attempt: number) {
  if (!attempt) return src;
  const [path, hash] = src.split("#", 2);
  return `${path}${path.includes("?") ? "&" : "?"}retry=${attempt}${hash === undefined ? "" : `#${hash}`}`;
}

export function scrollToHighlight(target: HTMLElement, reducedMotion: boolean) {
  target.scrollIntoView({ block: "center", inline: "nearest", behavior: reducedMotion ? "instant" : "smooth" });
}
