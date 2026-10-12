// @ts-check
/**
 * A tela de edição: desenha o diagrama e responde ao mouse.
 *
 * - clicar seleciona (Shift junta à seleção); clicar no vazio limpa;
 * - arrastar um elemento o move, com o que está dentro dele; soltá-lo dentro
 *   de outro registro o aninha, e soltá-lo fora o desaninha;
 * - arrastar um canto redimensiona;
 * - arrastar de um dos pontos nos lados de um elemento até outro elemento
 *   cria um fluxo; o lado de chegada é o mais perto de onde se solta;
 * - com um tipo escolhido na paleta, clicar cria um elemento ali.
 *
 * O que só serve para editar (pontos, cantos, destaques) vai numa camada
 * marcada com data-auxiliar, que não entra no SVG exportado.
 */
import { LADOS, TAMANHO_PADRAO, caixasAbsolutas, contem, indexar } from './modelo.js';
import { desenharDiagrama } from './desenho.js';
import { NORMAL, meioDoLado } from './geometria.js';
import { aninhar, criarElemento, interfaceQueContem, ligar, mover, redimensionar, TAMANHO_MINIMO } from './edicao.js';

/** @typedef {import('./modelo.js').Documento} Documento */
/** @typedef {import('./modelo.js').Diagrama} Diagrama */
/** @typedef {import('./modelo.js').Elemento} Elemento */
/** @typedef {import('./modelo.js').Ponta} Ponta */
/** @typedef {import('./modelo.js').Lado} Lado */
/** @typedef {import('./modelo.js').Tipo} Tipo */
/** @typedef {import('./modelo.js').Caixa} Caixa */
/** @typedef {{x: number, y: number}} Ponto */

/**
 * @typedef {object} Contexto
 * @property {() => Documento} documento
 * @property {() => string} diagramaId
 * @property {() => string[]} selecao
 * @property {(ids: string[]) => void} selecionar
 * @property {(doc: Documento, selecao?: string[]) => void} aplicar  registra um passo no histórico
 * @property {() => Tipo|null} modo  o tipo escolhido na paleta, se houver
 * @property {() => void} fimDoModo
 * @property {(mensagem: string) => void} avisar
 * @property {(id: string) => void} editarNome
 */

/**
 * @typedef {{tipo: 'mover', inicio: Ponto, ids: string[], base: Documento, moveu: boolean, destaque?: string}
 *   | {tipo: 'redimensionar', id: string, alca: string, inicio: Ponto, caixa: Caixa, base: Documento}
 *   | {tipo: 'ligar', de: Ponta, atual: Ponto, destino: Ponta|null}} Arrasto
 */

const NS = 'http://www.w3.org/2000/svg';
const ALCAS = ['nw', 'ne', 'sw', 'se'];

/**
 * @param {HTMLElement} tela @param {Contexto} ctx
 * @returns {{mostrar: () => void}}
 */
export function ligarTela(tela, ctx) {
  /** @type {SVGSVGElement|null} */ let svg = null;
  /** @type {SVGGElement|null} */ let camada = null;
  /** @type {Caixa} */ let quadro = { x: 0, y: 0, w: 800, h: 500 };
  /** @type {Arrasto|null} */ let arrasto = null;
  /** @type {string|null} */ let sobre = null;
  /** O diagrama que está na tela (o do documento, ou a prévia de um arrasto). */
  /** @type {Diagrama|null} */ let atual = null;

  const diagramaDe = (/** @type {Documento} */ doc) => doc.diagramas.find((d) => d.id === ctx.diagramaId()) ?? null;

  /** Unidade de tela: quanto vale um pixel em unidades do desenho. */
  const unidade = () => quadro.w / Math.max(200, tela.clientWidth || 800);

  /** @param {Documento} [previa] */
  function mostrar(previa) {
    const d = diagramaDe(previa ?? ctx.documento());
    if (!d) {
      tela.replaceChildren();
      return;
    }
    atual = d;
    svg = desenharDiagrama(d);
    const vb = (svg.getAttribute('viewBox') ?? '0 0 0 0').split(' ').map(Number);
    const x0 = Math.min(vb[0], 0), y0 = Math.min(vb[1], 0);
    const novo = { x: x0, y: y0, w: Math.max(vb[0] + vb[2] - x0, 800), h: Math.max(vb[1] + vb[3] - y0, 500) };
    // Durante um arrasto o quadro só cresce, para o desenho não pular sob o mouse.
    if (arrasto) {
      const x = Math.min(quadro.x, novo.x), y = Math.min(quadro.y, novo.y);
      quadro = { x, y, w: Math.max(quadro.x + quadro.w, novo.x + novo.w) - x, h: Math.max(quadro.y + quadro.h, novo.y + novo.h) - y };
    } else {
      quadro = novo;
    }
    svg.setAttribute('viewBox', [quadro.x, quadro.y, quadro.w, quadro.h].join(' '));
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.classList.add('editavel');
    if (ctx.modo()) svg.classList.add('criando');
    for (const id of ctx.selecao()) {
      svg.querySelector(`[data-id="${CSS.escape(id)}"], [data-fluxo="${CSS.escape(id)}"]`)?.classList.add('selecionado');
    }
    camada = /** @type {SVGGElement} */ (document.createElementNS(NS, 'g'));
    camada.setAttribute('class', 'sobreposicao');
    camada.setAttribute('data-auxiliar', '');
    svg.append(camada);
    tela.replaceChildren(svg);
    sobreposicao();
  }

  /** Redesenha só a camada de edição: pontos, cantos, destaques. */
  function sobreposicao() {
    if (!camada || !atual) return;
    camada.replaceChildren();
    const d = atual;
    const idx = indexar(d);
    const caixas = caixasAbsolutas(d);
    const u = unidade();
    /** @param {string} nome @param {Record<string, string|number>} attrs */
    const no = (nome, attrs) => {
      const e = document.createElementNS(NS, nome);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
      /** @type {SVGGElement} */ (camada).append(e);
      return e;
    };
    /** @param {string} id @param {string} classe */
    const contorno = (id, classe) => {
      const c = caixas.get(id);
      if (c) no('rect', { class: classe, x: c.x - 4 * u, y: c.y - 4 * u, width: c.w + 8 * u, height: c.h + 8 * u, rx: 4 * u });
    };
    /** @param {string} id @param {Lado|null} [escolhido] */
    const portas = (id, escolhido) => {
      const e = idx.get(id);
      const c = caixas.get(id);
      if (!e || !c || e.tipo === 'anotacao') return;
      for (const lado of LADOS) {
        const m = meioDoLado(c, e.tipo, lado);
        const afasta = e.tipo === 'juncao' ? 9 * u : 0;
        no('circle', {
          class: `porta${lado === escolhido ? ' escolhida' : ''}`, 'data-porta': lado, 'data-elemento': id,
          cx: m.x + NORMAL[lado].x * afasta, cy: m.y + NORMAL[lado].y * afasta, r: 5 * u,
        });
      }
    };

    if (arrasto?.tipo === 'mover' && arrasto.destaque) contorno(arrasto.destaque, 'destaque');
    if (arrasto?.tipo === 'ligar') {
      const e = /** @type {Elemento} */ (idx.get(arrasto.de.elemento));
      const p = meioDoLado(/** @type {Caixa} */ (caixas.get(e.id)), e.tipo, arrasto.de.lado);
      if (arrasto.destino) {
        contorno(arrasto.destino.elemento, 'destaque');
        portas(arrasto.destino.elemento, arrasto.destino.lado);
      }
      no('line', { class: 'elastico', x1: p.x, y1: p.y, x2: arrasto.atual.x, y2: arrasto.atual.y, 'stroke-width': 1.5 * u });
      return;
    }
    if (arrasto) return;
    const sel = ctx.selecao();
    if (sel.length === 1) {
      const e = idx.get(sel[0]);
      const c = caixas.get(sel[0]);
      if (e && c && e.tipo !== 'juncao') {
        for (const alca of ALCAS) {
          const x = alca.includes('w') ? c.x : c.x + c.w;
          const y = alca.includes('n') ? c.y : c.y + c.h;
          no('rect', { class: `alca alca-${alca}`, 'data-alca': alca, 'data-elemento': e.id, x: x - 4 * u, y: y - 4 * u, width: 8 * u, height: 8 * u });
        }
      }
    }
    if (!ctx.modo() && sobre && idx.has(sobre)) portas(sobre);
  }

  /** @param {PointerEvent|MouseEvent} ev @returns {Ponto} */
  function ponto(ev) {
    const m = svg?.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  /**
   * O elemento onde um fluxo chegaria, soltando em p: o menor que contém p
   * (com uma folga, para pegar a junção), e o lado mais perto.
   * @param {Ponto} p @returns {Ponta|null}
   */
  function destinoEm(p) {
    if (!atual) return null;
    const idx = indexar(atual);
    const caixas = caixasAbsolutas(atual);
    const folga = 8 * unidade();
    /** @type {Elemento|null} */ let melhor = null;
    let area = Infinity;
    for (const e of atual.elementos) {
      if (e.tipo === 'anotacao') continue;
      const c = /** @type {Caixa} */ (caixas.get(e.id));
      if (p.x < c.x - folga || p.x > c.x + c.w + folga || p.y < c.y - folga || p.y > c.y + c.h + folga) continue;
      const a = (c.w + 2 * folga) * (c.h + 2 * folga);
      if (a < area || (a === area && melhor && contem(atual, melhor.id, e.id, idx))) {
        melhor = e;
        area = a;
      }
    }
    if (!melhor) return null;
    const c = /** @type {Caixa} */ (caixas.get(melhor.id));
    const dx = (p.x - (c.x + c.w / 2)) / Math.max(c.w / 2, 1);
    const dy = (p.y - (c.y + c.h / 2)) / Math.max(c.h / 2, 1);
    /** @type {Lado} */
    const lado = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'esquerda' : 'direita') : (dy < 0 ? 'topo' : 'baixo');
    return { elemento: melhor.id, lado };
  }

  /** Os elementos que se movem de fato: os que não estão dentro de outro que também se move. */
  function topos(/** @type {Diagrama} */ d, /** @type {string[]} */ ids) {
    const idx = indexar(d);
    return ids.filter((id) => !ids.some((o) => o !== id && contem(d, o, id, idx)));
  }

  /** @param {PointerEvent} ev */
  function aoApertar(ev) {
    if (ev.button !== 0 || !svg || !atual) return;
    const p = ponto(ev);
    const doc = ctx.documento();
    const did = ctx.diagramaId();
    const tipo = ctx.modo();
    if (tipo) {
      const t = TAMANHO_PADRAO[tipo];
      const caixa = { x: p.x - t.w / 2, y: p.y - t.h / 2, w: t.w, h: t.h };
      try {
        const r = criarElemento(doc, did, { tipo, x: caixa.x, y: caixa.y, pai: interfaceQueContem(atual, caixa) });
        ctx.fimDoModo();
        ctx.aplicar(r.documento, [r.id]);
      } catch (e) {
        ctx.avisar(/** @type {Error} */ (e).message);
      }
      return;
    }
    const alvo = /** @type {Element} */ (ev.target);
    const porta = alvo.closest('[data-porta]');
    if (porta) {
      const elemento = /** @type {string} */ (porta.getAttribute('data-elemento'));
      const lado = /** @type {Lado} */ (porta.getAttribute('data-porta'));
      arrasto = { tipo: 'ligar', de: { elemento, lado }, atual: p, destino: null };
      captura(ev);
      sobreposicao();
      return;
    }
    const alca = alvo.closest('[data-alca]');
    if (alca) {
      const id = /** @type {string} */ (alca.getAttribute('data-elemento'));
      const caixa = /** @type {Caixa} */ (caixasAbsolutas(atual).get(id));
      arrasto = { tipo: 'redimensionar', id, alca: /** @type {string} */ (alca.getAttribute('data-alca')), inicio: p, caixa, base: doc };
      captura(ev);
      return;
    }
    const g = alvo.closest('[data-id], [data-fluxo]');
    if (!g) {
      ctx.selecionar([]);
      return;
    }
    const id = /** @type {string} */ (g.getAttribute('data-id') ?? g.getAttribute('data-fluxo'));
    const sel = ctx.selecao();
    if (ev.shiftKey) {
      ctx.selecionar(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
      return;
    }
    if (!sel.includes(id)) ctx.selecionar([id]);
    if (g.hasAttribute('data-fluxo')) return;
    const ids = ctx.selecao().filter((x) => atual?.elementos.some((e) => e.id === x));
    arrasto = { tipo: 'mover', inicio: p, ids, base: doc, moveu: false };
    captura(ev);
  }

  /** @param {PointerEvent} ev */
  function captura(ev) {
    try { tela.setPointerCapture(ev.pointerId); } catch { /* sem captura, segue */ }
    ev.preventDefault();
  }

  /** @param {PointerEvent} ev */
  function aoMover(ev) {
    if (!svg) return;
    const p = ponto(ev);
    if (!arrasto) {
      const alvo = /** @type {Element} */ (ev.target);
      const marcado = alvo.closest?.('[data-elemento]')?.getAttribute('data-elemento')
        ?? alvo.closest?.('[data-id]')?.getAttribute('data-id') ?? null;
      if (marcado !== sobre) {
        sobre = marcado;
        sobreposicao();
      }
      return;
    }
    const did = ctx.diagramaId();
    if (arrasto.tipo === 'ligar') {
      arrasto.atual = p;
      arrasto.destino = destinoEm(p);
      sobreposicao();
      return;
    }
    const dx = p.x - arrasto.inicio.x, dy = p.y - arrasto.inicio.y;
    try {
      if (arrasto.tipo === 'mover') {
        if (!arrasto.moveu && Math.hypot(dx, dy) < 3 * unidade()) return;
        arrasto.moveu = true;
        const previa = mover(arrasto.base, did, arrasto.ids, dx, dy);
        const d = /** @type {Diagrama} */ (diagramaDe(previa));
        const [um] = topos(d, arrasto.ids);
        arrasto.destaque = um ? interfaceQueContem(d, /** @type {Caixa} */ (caixasAbsolutas(d).get(um)), arrasto.ids) : undefined;
        mostrar(previa);
      } else {
        mostrar(redimensionar(arrasto.base, did, arrasto.id, novaCaixa(arrasto.caixa, arrasto.alca, dx, dy)));
      }
    } catch {
      // posição que deixaria o documento inválido: fica a prévia anterior
    }
  }

  /** @param {Caixa} c @param {string} alca @param {number} dx @param {number} dy */
  function novaCaixa(c, alca, dx, dy) {
    let { x, y, w, h } = c;
    if (alca.includes('w')) {
      w = Math.max(TAMANHO_MINIMO, c.w - dx);
      x = c.x + c.w - w;
    } else {
      w = Math.max(TAMANHO_MINIMO, c.w + dx);
    }
    if (alca.includes('n')) {
      h = Math.max(TAMANHO_MINIMO, c.h - dy);
      y = c.y + c.h - h;
    } else {
      h = Math.max(TAMANHO_MINIMO, c.h + dy);
    }
    return { x, y, w, h };
  }

  /** @param {PointerEvent} ev */
  function aoSoltar(ev) {
    if (!arrasto) return;
    const a = arrasto;
    arrasto = null;
    const p = ponto(ev);
    const did = ctx.diagramaId();
    const dx = p.x - (a.tipo === 'ligar' ? 0 : a.inicio.x);
    const dy = p.y - (a.tipo === 'ligar' ? 0 : a.inicio.y);
    try {
      if (a.tipo === 'mover') {
        if (!a.moveu) {
          mostrar();
          return;
        }
        let doc = mover(a.base, did, a.ids, dx, dy);
        const d = /** @type {Diagrama} */ (diagramaDe(doc));
        const caixas = caixasAbsolutas(d);
        for (const id of topos(d, a.ids)) {
          const novoPai = interfaceQueContem(d, /** @type {Caixa} */ (caixas.get(id)), a.ids);
          if (novoPai !== d.elementos.find((e) => e.id === id)?.pai) doc = aninhar(doc, did, id, novoPai);
        }
        ctx.aplicar(doc);
      } else if (a.tipo === 'redimensionar') {
        if (Math.hypot(dx, dy) < 1) {
          mostrar();
          return;
        }
        ctx.aplicar(redimensionar(a.base, did, a.id, novaCaixa(a.caixa, a.alca, dx, dy)));
      } else {
        const destino = destinoEm(p);
        if (!destino) {
          mostrar();
          return;
        }
        const r = ligar(ctx.documento(), did, a.de, destino);
        ctx.aplicar(r.documento, [r.id]);
      }
    } catch (e) {
      ctx.avisar(/** @type {Error} */ (e).message);
      mostrar();
    }
  }

  /** @param {MouseEvent} ev */
  function aoClicarDuasVezes(ev) {
    const g = /** @type {Element} */ (ev.target).closest('[data-id]');
    const id = g?.getAttribute('data-id');
    if (id) ctx.editarNome(id);
  }

  tela.addEventListener('pointerdown', aoApertar);
  tela.addEventListener('pointermove', aoMover);
  tela.addEventListener('pointerup', aoSoltar);
  tela.addEventListener('pointercancel', () => {
    arrasto = null;
    mostrar();
  });
  tela.addEventListener('pointerleave', () => {
    if (!arrasto && sobre) {
      sobre = null;
      sobreposicao();
    }
  });
  tela.addEventListener('dblclick', aoClicarDuasVezes);

  return { mostrar: () => mostrar() };
}
