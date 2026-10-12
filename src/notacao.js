// @ts-check
/**
 * As convenções visuais da notação, num lugar só.
 *
 * Os valores vêm dos desenhos originais, feitos no PowerPoint (Ensaio.pptx):
 * vermelho FF0000, azul 4472C4 (o "accent1" do tema do Office), preto;
 * traço de 3 pt nas formas e 1 pt no losango (o original tem algumas formas
 * com 1 pt, mas a espessura não tem significado);
 * Courier New em negrito para nomes. Uma unidade do SVG vale um ponto.
 * Os fluxos, que no original têm 0,5 pt, aqui têm 1, para não sumirem
 * na tela quando o desenho é reduzido.
 */

/** @typedef {import('./modelo.js').Registro} Registro */

export const COR = /** @type {Record<Registro, string>} */ ({
  estatico: '#ff0000',
  virtual: '#4472c4',
  mecanico: '#000000',
});

export const NOME_DA_COR = /** @type {Record<Registro, string>} */ ({
  estatico: 'vermelho',
  virtual: 'azul',
  mecanico: 'preto',
});

export const TRACO = {
  normal: 3,
  decisao: 1,
  fluxo: 1,
};

/** Fonte dos nomes (legendas e rótulos). Courier New é monoespaçada: cada letra ocupa 0,6 do corpo. */
export const FONTE_NOMES = {
  familia: '"Courier New", Courier, "Liberation Mono", "Nimbus Mono PS", monospace',
  peso: 'bold',
  largura: 0.6,
  rotulo: 24,
  legenda: 26,
  saida: 20, // s e n nas saídas de uma decisão
  minimo: 7,
};

export const FONTE_ANOTACAO = {
  familia: '"Cambria Math", Cambria, "Times New Roman", "Liberation Serif", serif',
  tamanho: 22,
};

/** Raio dos cantos do retângulo arredondado, como no PowerPoint: 1/6 do lado menor. */
export const FRACAO_DO_CANTO = 1 / 6;

/** Distância de uma legenda ao canto superior direito da forma. */
export const RECUO_DA_LEGENDA = { direita: 14, topo: 8 };

/**
 * A cada nível de aninhamento, a legenda diminui nesta proporção. Nos
 * desenhos originais, o Fatorial de dentro tem 18,66 pt e o de fora, 26 a 32.
 */
export const REDUCAO_POR_NIVEL = 0.72;

/** Ponta de seta aberta (o "arrow" do PowerPoint). */
export const SETA = { comprimento: 9, abertura: 4.5 };

/** Comprimento mínimo do trecho reto que sai de uma porta antes de dobrar. */
export const TOCO = 14;

/** Margem em volta do desenho, no SVG. */
export const MARGEM = 24;

/**
 * Tamanho de letra que cabe numa largura e numa altura, sem passar do corpo
 * pedido. As linhas são separadas por \n.
 * @param {string} texto @param {number} corpo @param {number} largura @param {number} altura
 */
export function corpoQueCabe(texto, corpo, largura, altura) {
  const linhas = texto.split('\n');
  const maior = Math.max(1, ...linhas.map((l) => [...l].length));
  const porLargura = largura / (maior * FONTE_NOMES.largura);
  const porAltura = altura / (linhas.length * 1.15);
  return Math.max(FONTE_NOMES.minimo, Math.min(corpo, porLargura, porAltura));
}

/**
 * Onde fica a legenda de um elemento, e com que corpo de letra. A caixa
 * devolvida é relativa ao canto superior esquerdo do elemento; `direita` é
 * onde o texto termina (ele é alinhado à direita).
 * @param {string} legenda @param {string} tipo @param {number} w @param {number} h
 * @param {number} profundidade quantas interfaces envolvem o elemento
 */
export function medidaDaLegenda(legenda, tipo, w, h, profundidade) {
  const raio = tipo === 'virtual' ? Math.min(w, h) * FRACAO_DO_CANTO : 0;
  const direita = w - (RECUO_DA_LEGENDA.direita + raio * 0.25);
  const pedido = FONTE_NOMES.legenda * REDUCAO_POR_NIVEL ** profundidade;
  const corpo = corpoQueCabe(legenda, pedido, direita - 10, Math.max(h * 0.3, FONTE_NOMES.minimo * 1.2));
  const linhas = legenda.split('\n');
  const largura = Math.max(...linhas.map((l) => [...l].length)) * corpo * FONTE_NOMES.largura;
  const altura = linhas.length * corpo * 1.15;
  return { corpo, direita, x: direita - largura, y: RECUO_DA_LEGENDA.topo, w: largura, h: altura };
}
