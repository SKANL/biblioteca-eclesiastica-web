export interface FacetValue {
  valor: string;
  count: number;
}

export interface FacetsResponse {
  generos: FacetValue[];
  autores: FacetValue[];
}

export interface SearchHit {
  libro_id: string;
  titulo: string | null;
  autor: string | null;
  ref: string;
  numero: number;
  capitulo_numero: number | null;
  snippet: string;
  score: number | null;
  imagen_url: string | null;
  bbox: number[] | null;
  bloque_idx: number | null;
  bbox_norm: number[] | null;
  coincidencias?: TextMatch[];
  coincidencias_truncadas?: boolean;
}

export interface SearchResponse {
  total: number;
  resultados: SearchHit[];
}

export interface Metadatos {
  titulo: string;
  subtitulo?: string | null;
  autor?: string | null;
  autor_normalizado?: string | null;
  editorial?: string | null;
  anio_publicacion?: number | null;
  idioma?: string;
  genero?: string | null;
  tradicion?: string | null;
  isbn?: string | null;
  temas?: string[];
  descripcion?: string | null;
}

export interface Capitulo {
  numero: number;
  titulo: string | null;
  pagina_inicio: number | null;
  pagina_fin: number | null;
}

export interface BookDetail {
  libro_id: string;
  metadatos: Metadatos;
  capitulos: Capitulo[];
  estado_ingesta: string;
  conteo_paginas: number;
  conteo_palabras_total: number;
  caracteres_totales: number;
}

export interface Bloque {
  bbox: number[];
  texto: string;
  bbox_norm: number[] | null;
  tipo?: string;
  orden?: number | null;
}

export interface Figura {
  bbox: number[];
  bbox_norm: number[] | null;
  imagen_url: string | null;
  imagen_ancho?: number | null;
  imagen_alto?: number | null;
  tipo?: string;
  orden?: number | null;
  pie?: string | null;
  texto_alternativo?: string | null;
  estado?: string;
  detectada?: boolean | null;
  precision?: string | null;
  componentes?: number[][];
  advertencia?: string | null;
}

export interface PageResponse {
  libro_id: string;
  ref: string;
  numero: number;
  capitulo_numero: number | null;
  texto: string;
  conteo_palabras: number;
  conteo_caracteres: number;
  imagen_url: string | null;
  imagen_ancho: number | null;
  imagen_alto: number | null;
  bloques: Bloque[];
  figuras: Figura[];
  lectura?: { inicio: number; fin: number; tipo: "prosa" | "visual" | "nota" }[];
  ref_anterior: string | null;
  ref_siguiente: string | null;
  motor?: string | null;
  coincidencias?: TextMatch[];
  coincidencias_truncadas?: boolean;
  advertencia_localizacion?: string | null;
}

export interface TextMatch {
  inicio: number;
  fin: number;
  rects: number[][];
  precision: "exacta" | "bloque" | "sin_localizar";
  fuente: string | null;
  advertencia: string | null;
}

export interface CitationResponse {
  cita: string;
  ref: string;
  estilo: string;
}

export const CITATION_STYLES = ["apa", "chicago", "mla"] as const;
export type CitationStyle = (typeof CITATION_STYLES)[number];

export interface BookSummary {
  libro_id: string;
  metadatos: Metadatos;
  estado_ingesta: string;
  conteo_paginas: number;
  conteo_palabras_total: number;
  caracteres_totales: number;
  actualizado_en: string | null;
}

export interface BookListResponse {
  total: number;
  resultados: BookSummary[];
}

export interface PageSummary {
  numero: number;
  ref: string;
  capitulo_numero: number | null;
  conteo_palabras: number;
  imagen_url: string | null;
}

export interface PageListResponse {
  total: number;
  resultados: PageSummary[];
}
