// @ts-check
/**
 * Liga as partes na página: abre o documento de exemplo, preenche a lista
 * de diagramas, desenha o escolhido e liga o inspetor.
 */
import { abrir, VERSAO } from './modelo.js';
import { desenharDiagrama } from './desenho.js';
import { ligarInspetor } from './inspetor.js';

const EXEMPLO = 'exemplos/artigo.json';

/** @param {string} id */
const pega = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
const seletor = /** @type {HTMLSelectElement} */ (pega('diagramas'));
const tela = pega('tela');
const painel = pega('inspetor');
const estado = pega('estado');
const legenda = pega('legenda-do-diagrama');

/** @type {(() => void)|null} */
let desligar = null;

async function iniciar() {
  let texto;
  try {
    const resposta = await fetch(EXEMPLO);
    if (!resposta.ok) throw new Error(`${resposta.status} ${resposta.statusText}`);
    texto = await resposta.text();
  } catch (e) {
    estado.textContent = `Não consegui carregar ${EXEMPLO}: ${/** @type {Error} */ (e).message}. A página precisa ser servida por HTTP (veja o README).`;
    return;
  }
  const { documento, erros, avisos } = abrir(texto);
  if (!documento) {
    estado.textContent = `O documento de exemplo tem erros: ${erros.join('; ')}`;
    return;
  }
  for (const d of documento.diagramas) {
    const op = document.createElement('option');
    op.value = d.id;
    op.textContent = d.titulo ? d.titulo.split(':')[0] : d.id;
    seletor.appendChild(op);
  }

  /** @param {string} id */
  const mostrar = (id) => {
    const d = documento.diagramas.find((x) => x.id === id) ?? documento.diagramas[0];
    seletor.value = d.id;
    desligar?.();
    const svg = desenharDiagrama(d);
    tela.replaceChildren(svg);
    legenda.textContent = d.titulo ?? '';
    desligar = ligarInspetor(svg, d, painel);
    if (location.hash !== `#${d.id}`) history.replaceState(null, '', `#${d.id}`);
  };

  seletor.addEventListener('change', () => mostrar(seletor.value));
  addEventListener('hashchange', () => mostrar(location.hash.slice(1)));
  mostrar(location.hash.slice(1));

  const n = documento.diagramas.length;
  estado.textContent = `${n} diagramas · formato ${documento.formato}, versão ${VERSAO} · ${
    avisos.length ? `${avisos.length} aviso(s): ${avisos.join('; ')}` : 'sem erros nem avisos'}`;
  document.body.dataset.pronto = 'sim';
}

iniciar();
