// Testes da geometria: portas e rotas. Uso: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { abrir, caixasAbsolutas, indexar } from '../src/modelo.js';
import {
  atravessa, direcaoDoTrecho, obstaculosDoFluxo, porta, rota, rotaDoFluxo, rotaValida, simplifica,
} from '../src/geometria.js';

const P = (x, y) => ({ x, y });
const DIREITA = P(1, 0), ESQUERDA = P(-1, 0), CIMA = P(0, -1), BAIXO = P(0, 1);

test('simplifica tira repetidos e pontos no meio de trechos retos', () => {
  assert.deepEqual(simplifica([P(0, 0), P(0, 0), P(5, 0), P(10, 0), P(10, 5)]), [P(0, 0), P(10, 0), P(10, 5)]);
});

test('direção de trecho', () => {
  assert.deepEqual(direcaoDoTrecho(P(0, 0), P(0, -3)), CIMA);
  assert.equal(direcaoDoTrecho(P(0, 0), P(2, 3)), null);
});

test('portas alinhadas dão uma reta', () => {
  assert.deepEqual(rota(P(0, 10), DIREITA, P(100, 10), DIREITA), [P(0, 10), P(100, 10)]);
});

test('saída para cima e chegada pela esquerda dão um L', () => {
  const r = rota(P(0, 100), CIMA, P(80, 20), DIREITA);
  assert.deepEqual(r, [P(0, 100), P(0, 20), P(80, 20)]);
});

test('da junção para o topo de uma máquina: sobe, anda e desce', () => {
  // como na Figura 4: a entrada vai, por cima, ser o algoritmo da máquina vazia
  const r = rota(P(10, 100), CIMA, P(200, 50), BAIXO);
  assert.ok(rotaValida(r, CIMA, BAIXO));
  assert.equal(r.length, 4);
  assert.ok(r[1].y < 50, 'passa acima do topo da máquina');
});

test('toda rota escolhida é ortogonal e respeita as direções', () => {
  const casos = [
    [P(0, 0), DIREITA, P(50, 80), BAIXO],
    [P(0, 0), BAIXO, P(-50, 80), ESQUERDA],
    [P(0, 0), DIREITA, P(-50, 0), DIREITA],
    [P(0, 0), CIMA, P(0, 50), BAIXO],
  ];
  for (const [p1, d1, p2, d2] of casos) {
    const r = rota(p1, d1, p2, d2);
    assert.ok(rotaValida(r, d1, d2), JSON.stringify({ p1, d1, p2, d2, r }));
  }
});

test('a rota contorna obstáculos quando pode', () => {
  const caixa = { x: 40, y: -10, w: 20, h: 20 };
  const r = rota(P(0, 0), DIREITA, P(100, 0), DIREITA, [{ caixa, papel: 'livre' }]);
  assert.ok(rotaValida(r, DIREITA, DIREITA));
  for (let i = 0; i < r.length - 1; i++) assert.ok(!atravessa(r[i], r[i + 1], caixa), JSON.stringify(r));
});

test('nos exemplos, toda rota é ortogonal e nenhuma atravessa um elemento de fora', async () => {
  const texto = await readFile(new URL('../exemplos/artigo.json', import.meta.url), 'utf8');
  const { documento } = abrir(texto);
  for (const d of documento.diagramas) {
    const caixas = caixasAbsolutas(d);
    const idx = indexar(d);
    for (const f of d.fluxos) {
      const r = rotaDoFluxo(d, f, caixas, idx);
      const s = porta(d, caixas, idx, f.de, f.para, 'de');
      const c = porta(d, caixas, idx, f.para, f.de, 'para');
      assert.ok(rotaValida(r, s.direcao, c.direcao), `${d.id}/${f.id}`);
      for (const o of obstaculosDoFluxo(d, f, caixas, idx)) {
        for (let i = 0; i < r.length - 1; i++) {
          if (o.papel === 'origem' && i === 0) continue;
          if (o.papel === 'destino' && i === r.length - 2) continue;
          assert.ok(!atravessa(r[i], r[i + 1], o.caixa), `${d.id}/${f.id} atravessa ${JSON.stringify(o.caixa)}`);
        }
      }
    }
  }
});

test('a porta de uma interface vista de dentro fica alinhada com a outra ponta', async () => {
  const texto = await readFile(new URL('../exemplos/artigo.json', import.meta.url), 'utf8');
  const { documento } = abrir(texto);
  const d = documento.diagramas.find((x) => x.id === 'figura-4');
  const caixas = caixasAbsolutas(d);
  const idx = indexar(d);
  // f1: a entrada chega pela borda esquerda de Não-autoaceitadorRE? e vai à junção, reta
  const f = d.fluxos.find((x) => x.id === 'f1');
  const r = rotaDoFluxo(d, f, caixas, idx);
  assert.equal(r.length, 2);
  assert.equal(r[0].y, r[1].y);
});
