// @ts-check
/**
 * Desenha um diagrama em SVG. Não guarda estado: recebe o diagrama, devolve
 * um elemento <svg>. O aninhamento do documento vira aninhamento de grupos
 * <g> (menos para as junções, que vão por cima das linhas), e cada grupo leva
 * data-id, data-tipo e data-pai, de modo que o SVG exportado conserva a
 * estrutura.
 */
import { NOME_DO_TIPO, ancestrais, caixasAbsolutas, filhos, indexar, registroDoFluxo, tamanho } from './modelo.js';
import { envolve, rotaDoFluxo } from './geometria.js';
import {
  COR, FONTE_ANOTACAO, FONTE_NOMES, FRACAO_DO_CANTO, MARGEM, SETA, TRACO, corpoQueCabe, medidaDaLegenda,
} from './notacao.js';

/** @typedef {import('./modelo.js').Diagrama} Diagrama */
/** @typedef {import('./modelo.js').Elemento} Elemento */
/** @typedef {import('./modelo.js').Registro} Registro */
/** @typedef {import('./geometria.js').Ponto} Ponto */

const NS = 'http://www.w3.org/2000/svg';

/**
 * @param {Diagrama} d
 * @param {{dom?: Document}} [opcoes]
 * @returns {SVGSVGElement}
 */
export function desenharDiagrama(d, opcoes = {}) {
  const dom = opcoes.dom ?? document;

  /**
   * @param {string} nome @param {Record<string, string|number>} [attrs] @param {Element} [pai]
   * @returns {SVGElement}
   */
  const no = (nome, attrs = {}, pai) => {
    const e = /** @type {SVGElement} */ (dom.createElementNS(NS, nome));
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    if (pai) pai.appendChild(e);
    return e;
  };

  const idx = indexar(d);
  const caixas = caixasAbsolutas(d);
  const svg = /** @type {SVGSVGElement} */ (no('svg', { xmlns: NS, class: 'diagrama', 'data-diagrama': d.id }));
  if (d.titulo) no('title', {}, svg).textContent = d.titulo;

  const defs = no('defs', {}, svg);
  /** @type {Record<Registro, string>} */
  const marcadores = { estatico: '', virtual: '', mecanico: '' };
  for (const reg of /** @type {Registro[]} */ (['estatico', 'virtual', 'mecanico'])) {
    const id = `seta-${d.id}-${reg}`;
    marcadores[reg] = id;
    const m = no('marker', {
      id, viewBox: `0 0 ${SETA.comprimento} ${SETA.abertura * 2}`, refX: SETA.comprimento, refY: SETA.abertura,
      markerWidth: SETA.comprimento, markerHeight: SETA.abertura * 2, markerUnits: 'userSpaceOnUse', orient: 'auto',
    }, defs);
    no('path', {
      d: `M0,0 L${SETA.comprimento},${SETA.abertura} L0,${SETA.abertura * 2}`,
      fill: 'none', stroke: COR[reg], 'stroke-width': TRACO.fluxo,
    }, m);
  }

  const camadaElementos = no('g', { class: 'elementos' }, svg);
  const camadaFluxos = no('g', { class: 'fluxos' }, svg);
  const camadaJuncoes = no('g', { class: 'juncoes' }, svg);

  /** @type {Set<string>} */
  const desenhados = new Set();

  /** @param {Elemento} e @param {Element} pai */
  const desenhaElemento = (e, pai) => {
    if (desenhados.has(e.id)) return; // documento com aninhamento circular: não trava
    desenhados.add(e.id);
    const { w, h } = tamanho(e);
    const estrutura = { 'data-id': e.id, 'data-tipo': e.tipo, ...(e.pai ? { 'data-pai': e.pai } : {}) };
    if (e.tipo === 'juncao') {
      // Junções ficam por cima das linhas: vão para a última camada, em coordenadas
      // do diagrama. O aninhamento continua dito em data-pai.
      const c = /** @type {import('./modelo.js').Caixa} */ (caixas.get(e.id));
      const g = no('g', estrutura, camadaJuncoes);
      no('title', {}, g).textContent = 'junção';
      no('circle', { class: 'forma', cx: c.x + c.w / 2, cy: c.y + c.h / 2, r: Math.min(c.w, c.h) / 2, fill: '#000' }, g);
      return;
    }
    const g = no('g', { ...estrutura, transform: `translate(${e.x} ${e.y})` }, pai);
    const titulo = [e.legenda, e.rotulo, e.texto].filter(Boolean).join(' · ');
    no('title', {}, g).textContent = `${NOME_DO_TIPO[e.tipo]}${titulo ? ` · ${titulo}` : ''}`;
    const largura = TRACO.normal;
    switch (e.tipo) {
      case 'estatico':
        no('ellipse', { class: 'forma', cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2, fill: '#fff', stroke: COR.estatico, 'stroke-width': largura }, g);
        break;
      case 'virtual': {
        const r = Math.min(w, h) * FRACAO_DO_CANTO;
        no('rect', { class: 'forma', x: 0, y: 0, width: w, height: h, rx: r, ry: r, fill: '#fff', stroke: COR.virtual, 'stroke-width': largura }, g);
        break;
      }
      case 'mecanico':
        no('rect', { class: 'forma', x: 0, y: 0, width: w, height: h, fill: '#fff', stroke: COR.mecanico, 'stroke-width': largura }, g);
        break;
      case 'decisao':
        no('polygon', { class: 'forma', points: `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`, fill: '#fff', stroke: '#000', 'stroke-width': TRACO.decisao }, g);
        break;
      case 'anotacao':
        no('rect', { class: 'forma', x: 0, y: 0, width: w, height: h, fill: 'none', stroke: 'none' }, g);
        texto(g, e.texto ?? '', w / 2, h / 2, {
          familia: FONTE_ANOTACAO.familia, corpo: FONTE_ANOTACAO.tamanho, cor: '#000', ancora: 'middle',
        });
        break;
    }
    const cor = e.tipo === 'decisao' ? '#000' : COR[/** @type {Registro} */ (e.tipo)] ?? '#000';
    if (e.rotulo) {
      const [lw, lh] = e.tipo === 'estatico' ? [w * 0.78, h * 0.72] : e.tipo === 'decisao' ? [w * 0.55, h * 0.45] : [w - 8, h - 8];
      const corpo = corpoQueCabe(e.rotulo, FONTE_NOMES.rotulo, lw, lh);
      texto(g, e.rotulo, w / 2, h / 2, { familia: FONTE_NOMES.familia, peso: FONTE_NOMES.peso, corpo, cor, ancora: 'middle' });
    }
    if (e.legenda) {
      const m = medidaDaLegenda(e.legenda, e.tipo, w, h, ancestrais(d, e.id, idx).length);
      texto(g, e.legenda, m.direita, m.y + m.h / 2, {
        familia: FONTE_NOMES.familia, peso: FONTE_NOMES.peso, corpo: m.corpo, cor, ancora: 'end',
      });
    }
    for (const filho of filhos(d, e.id)) desenhaElemento(filho, g);
  };

  /**
   * Texto em uma ou mais linhas, centrado verticalmente em y.
   * @param {Element} pai @param {string} conteudo @param {number} x @param {number} y
   * @param {{familia: string, corpo: number, cor: string, ancora: 'start'|'middle'|'end', peso?: string}} o
   */
  const texto = (pai, conteudo, x, y, o) => {
    const linhas = conteudo.split('\n');
    const entre = o.corpo * 1.15;
    const primeira = y - ((linhas.length - 1) * entre) / 2 + o.corpo * 0.35;
    const t = no('text', {
      x, y: primeira, 'font-family': o.familia, 'font-size': Number(o.corpo.toFixed(2)),
      fill: o.cor, 'text-anchor': o.ancora, ...(o.peso ? { 'font-weight': o.peso } : {}),
    }, pai);
    if (linhas.length === 1) {
      t.textContent = conteudo;
    } else {
      linhas.forEach((l, i) => {
        no('tspan', { x, dy: i === 0 ? 0 : Number(entre.toFixed(2)) }, t).textContent = l;
      });
    }
    return t;
  };

  for (const e of d.elementos) if (!e.pai || !idx.has(e.pai)) desenhaElemento(e, camadaElementos);

  /** @type {Ponto[]} */
  const pontosDeRotas = [];
  for (const f of d.fluxos) {
    const pts = rotaDoFluxo(d, f, caixas, idx);
    pontosDeRotas.push(...pts);
    const reg = registroDoFluxo(d, f, idx);
    const g = no('g', { 'data-fluxo': f.id, 'data-registro': reg }, camadaFluxos);
    const caminho = pts.map((p, i) => `${i ? 'L' : 'M'}${arred(p.x)},${arred(p.y)}`).join(' ');
    no('title', {}, g).textContent = `fluxo ${f.de.elemento} → ${f.para.elemento}`;
    // Faixa larga e invisível, só para o clique pegar a linha fina.
    no('path', { class: 'alvo', 'data-auxiliar': '', d: caminho, fill: 'none', stroke: 'transparent', 'stroke-width': 10 }, g);
    no('path', {
      class: 'linha', d: caminho, fill: 'none', stroke: COR[reg], 'stroke-width': TRACO.fluxo,
      // Na junção, o ponto já marca a chegada; a seta ficaria embolada nele.
      ...(idx.get(f.para.elemento)?.tipo === 'juncao' ? {} : { 'marker-end': `url(#${marcadores[reg]})` }),
    }, g);
    if (f.rotulo && pts.length > 1) {
      const [a, b] = pts;
      const vertical = Math.abs(a.x - b.x) < 0.01;
      const passo = Math.min(18, (Math.abs(b.x - a.x) + Math.abs(b.y - a.y)) / 2);
      const sx = Math.sign(b.x - a.x), sy = Math.sign(b.y - a.y);
      const px = a.x + sx * passo + (vertical ? 11 : 0);
      const py = a.y + sy * passo + (vertical ? 0 : -10);
      texto(g, f.rotulo, px, py, {
        familia: FONTE_NOMES.familia, peso: FONTE_NOMES.peso, corpo: FONTE_NOMES.saida, cor: '#000', ancora: vertical ? 'start' : 'middle',
      });
      pontosDeRotas.push({ x: px + 14, y: py + 12 }, { x: px - 14, y: py - 12 });
    }
  }

  const tudo = envolve([...caixas.values(), ...pontosDeRotas]);
  svg.setAttribute('viewBox', [tudo.x - MARGEM, tudo.y - MARGEM, tudo.w + 2 * MARGEM, tudo.h + 2 * MARGEM].map(arred).join(' '));
  svg.setAttribute('width', String(arred(tudo.w + 2 * MARGEM)));
  svg.setAttribute('height', String(arred(tudo.h + 2 * MARGEM)));
  return svg;
}

/** @param {number} v */
const arred = (v) => Math.round(v * 100) / 100;
