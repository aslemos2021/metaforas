// @ts-check
/**
 * Arquivos: o documento em JSON, o SVG exportado (com o documento dentro,
 * para poder reabri-lo) e a cópia guardada no navegador.
 */
import { abrir } from './modelo.js';
import { desenharDiagrama } from './desenho.js';

/** @typedef {import('./modelo.js').Documento} Documento */

/** Chave da cópia guardada no navegador. */
export const CHAVE_LOCAL = 'metaforas:documento';

/** Id do <metadata> que leva o documento dentro do SVG exportado. */
export const ID_DO_DOCUMENTO_NO_SVG = 'metaforas-documento';

/**
 * O documento em JSON, legível e bom para comparar versões: um elemento ou
 * um fluxo por linha.
 * @param {Documento} doc
 */
export function paraJSON(doc) {
  /** @type {string[]} */
  const guardados = [];
  const marca = (/** @type {unknown} */ o) => `\u0000${guardados.push(compacto(o)) - 1}\u0000`;
  const copia = {
    ...doc,
    diagramas: doc.diagramas.map((d) => ({
      ...d,
      elementos: d.elementos.map(marca),
      fluxos: d.fluxos.map(marca),
    })),
  };
  return `${JSON.stringify(copia, null, 2).replace(/"\\u0000(\d+)\\u0000"/g, (_, i) => guardados[Number(i)])}\n`;
}

/** JSON numa linha só, com espaço depois de vírgulas e dois-pontos. @param {unknown} v @returns {string} */
function compacto(v) {
  if (Array.isArray(v)) return `[${v.map(compacto).join(', ')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => `${JSON.stringify(k)}: ${compacto(x)}`).join(', ')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

/**
 * Um diagrama em SVG, pronto para outro programa, com o documento inteiro
 * guardado num <metadata>. Abrir esse SVG no editor traz o documento de volta.
 * @param {Documento} doc @param {string} did
 */
export function exportarSVG(doc, did) {
  const d = doc.diagramas.find((x) => x.id === did);
  if (!d) throw new Error(`Não há diagrama "${did}".`);
  const svg = desenharDiagrama(d);
  for (const aux of svg.querySelectorAll('[data-auxiliar]')) aux.remove();
  const meta = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
  meta.setAttribute('id', ID_DO_DOCUMENTO_NO_SVG);
  meta.setAttribute('data-diagrama', did);
  meta.textContent = JSON.stringify(doc);
  svg.insertBefore(meta, svg.firstChild);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}\n`;
}

/**
 * Lê um arquivo: JSON do documento, ou SVG exportado por este editor.
 * @param {string} texto
 * @returns {{documento: Documento|null, erros: string[], avisos: string[], diagrama?: string}}
 */
export function lerArquivo(texto) {
  if (!texto.trimStart().startsWith('<')) return abrir(texto);
  const svg = new DOMParser().parseFromString(texto, 'image/svg+xml');
  const meta = svg.getElementById(ID_DO_DOCUMENTO_NO_SVG);
  if (!meta?.textContent) {
    return { documento: null, erros: ['Este SVG não traz um documento de Metáforas (só os exportados por este editor trazem).'], avisos: [] };
  }
  return { ...abrir(meta.textContent), diagrama: meta.getAttribute('data-diagrama') ?? undefined };
}

/**
 * Oferece um texto para baixar como arquivo.
 * @param {string} nome @param {string} texto @param {string} tipo
 */
export function baixar(nome, texto, tipo) {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Um nome de arquivo a partir de um título. @param {string|undefined} titulo @param {string} reserva */
export function nomeDeArquivo(titulo, reserva) {
  const base = (titulo ?? '').split(':')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return base || reserva;
}

/** @param {Documento} doc */
export function guardarNoNavegador(doc) {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}

/** @returns {string|null} */
export function lerDoNavegador() {
  try {
    return localStorage.getItem(CHAVE_LOCAL);
  } catch {
    return null;
  }
}
