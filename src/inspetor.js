// @ts-check
/**
 * Inspetor: ao clicar num elemento ou fluxo do desenho, mostra a estrutura
 * que o documento guarda sobre ele (registro, interface, objetos, lados de
 * entrada). Por enquanto só lê; a edição começa na v0.
 */
import {
  ENTRADA_EM_VIRTUAL, NOME_DO_TIPO, POR_ONDE, SAIDA_DE_VIRTUAL, corDoFluxo, filhos, indexar,
} from './modelo.js';
import { NOME_DA_COR } from './notacao.js';

/** @typedef {import('./modelo.js').Diagrama} Diagrama */
/** @typedef {import('./modelo.js').Elemento} Elemento */
/** @typedef {import('./modelo.js').Fluxo} Fluxo */
/** @typedef {import('./modelo.js').Ponta} Ponta */

const FORMA = {
  estatico: 'elipse vermelha',
  virtual: 'retângulo azul de cantos arredondados',
  mecanico: 'retângulo preto',
  decisao: 'losango',
  juncao: 'ponto preto',
  anotacao: 'texto',
};

/**
 * @param {SVGSVGElement} svg @param {Diagrama} d @param {HTMLElement} painel
 * @returns {() => void} função que desliga o inspetor
 */
export function ligarInspetor(svg, d, painel) {
  const idx = indexar(d);
  const vazio = painel.innerHTML;

  /** @param {string} id */
  const nome = (id) => {
    const e = idx.get(id);
    if (!e) return id;
    const n = e.legenda || e.rotulo || e.texto;
    return n ? `${n.replace(/\n/g, '')} (${NOME_DO_TIPO[e.tipo]})` : `${NOME_DO_TIPO[e.tipo]} sem nome [${id}]`;
  };

  /** @param {Ponta} p @param {'entra'|'sai'} sentido */
  const lado = (p, sentido) => {
    const e = idx.get(p.elemento);
    const base = `${sentido} ${POR_ONDE[p.lado]}`;
    const como = e?.tipo !== 'virtual' ? undefined
      : sentido === 'entra' ? ENTRADA_EM_VIRTUAL[p.lado] : SAIDA_DE_VIRTUAL[p.lado];
    return como ? `${base}, ${como}` : base;
  };

  /** @param {Elemento} e */
  const descreveElemento = (e) => {
    const linhas = [`<h2>${NOME_DO_TIPO[e.tipo]}</h2>`, `<p class="forma">${FORMA[e.tipo]}</p>`, '<dl>'];
    const item = (/** @type {string} */ k, /** @type {string} */ v) => linhas.push(`<dt>${k}</dt><dd>${v}</dd>`);
    if (e.legenda) item('legenda', esc(e.legenda));
    if (e.rotulo) item('rótulo', esc(e.rotulo));
    if (e.texto) item('texto', esc(e.texto));
    if (e.pai) item('interface', `${esc(nome(e.pai))}; este elemento é objeto dentro dela`);
    const objs = filhos(d, e.id);
    if (objs.length) item('objetos', objs.map((o) => esc(nome(o.id))).join('<br>'));
    const chegam = d.fluxos.filter((f) => f.para.elemento === e.id);
    const saem = d.fluxos.filter((f) => f.de.elemento === e.id);
    if (chegam.length) item('fluxos que chegam', chegam.map((f) => `de ${esc(nome(f.de.elemento))}; ${lado(f.para, 'entra')}`).join('<br>'));
    if (saem.length) item('fluxos que saem', saem.map((f) => `para ${esc(nome(f.para.elemento))}; ${lado(f.de, 'sai')}`).join('<br>'));
    item('id', `<code>${esc(e.id)}</code>`);
    linhas.push('</dl>');
    return linhas.join('');
  };

  /** @param {Fluxo} f */
  const descreveFluxo = (f) => {
    const { registro: reg, motivo } = corDoFluxo(d, f, idx);
    const linhas = ['<h2>fluxo</h2>', '<dl>'];
    const item = (/** @type {string} */ k, /** @type {string} */ v) => linhas.push(`<dt>${k}</dt><dd>${v}</dd>`);
    item('de', `${esc(nome(f.de.elemento))}; ${lado(f.de, 'sai')}`);
    item('para', `${esc(nome(f.para.elemento))}; ${lado(f.para, 'entra')}`);
    item('cor', `${NOME_DA_COR[reg]} (${NOME_DO_TIPO[reg]}): ${esc(motivo)}`);
    if (f.rotulo) item('rótulo', esc(f.rotulo));
    item('id', `<code>${esc(f.id)}</code>`);
    linhas.push('</dl>');
    return linhas.join('');
  };

  /** @param {Element|null} alvo */
  const seleciona = (alvo) => {
    for (const s of svg.querySelectorAll('.selecionado')) s.classList.remove('selecionado');
    if (!alvo) {
      painel.innerHTML = vazio;
      return;
    }
    alvo.classList.add('selecionado');
    const id = alvo.getAttribute('data-id');
    const fluxo = alvo.getAttribute('data-fluxo');
    if (id) {
      const e = idx.get(id);
      if (e) painel.innerHTML = descreveElemento(e);
    } else if (fluxo) {
      const f = d.fluxos.find((x) => x.id === fluxo);
      if (f) painel.innerHTML = descreveFluxo(f);
    }
  };

  /** @param {Event} ev */
  const aoClicar = (ev) => {
    const alvo = /** @type {Element} */ (ev.target).closest('[data-id], [data-fluxo]');
    seleciona(alvo);
  };
  /** @param {KeyboardEvent} ev */
  const aoTeclar = (ev) => {
    if (ev.key === 'Escape') seleciona(null);
  };
  svg.addEventListener('click', aoClicar);
  document.addEventListener('keydown', aoTeclar);
  return () => {
    svg.removeEventListener('click', aoClicar);
    document.removeEventListener('keydown', aoTeclar);
    painel.innerHTML = vazio;
  };
}

/** Escapa para HTML; quebras de linha do desenho viram <br>. @param {string} s */
function esc(s) {
  return s
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
    .replace(/\n/g, '<br>');
}
