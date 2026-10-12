// Teste da página num navegador de verdade (Chromium, via Playwright).
// Sobe o servidor local, abre cada diagrama de exemplo, confere o desenho e
// o inspetor, e salva capturas em tests/capturas/ para olhar.
// Uso: node tests/pagina.mjs
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir } from '../ferramentas/servidor.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const capturas = path.join(aqui, 'capturas');

async function carregarPlaywright() {
  for (const alvo of ['playwright', '/opt/npm-tools/node_modules/playwright/index.mjs', '/opt/node-tools/node_modules/playwright/index.mjs']) {
    try { return await import(alvo); } catch { /* tenta o próximo */ }
  }
  console.error('Playwright não encontrado. Instale com: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const { chromium } = await carregarPlaywright();
const servidor = await servir(0);
const base = `http://127.0.0.1:${servidor.address().port}/`;
const navegador = await chromium.launch();
const aba = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
await mkdir(capturas, { recursive: true });

const erros = [];
aba.on('pageerror', (e) => erros.push(e.message));
aba.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

const resultados = [];
async function confere(nome, fn) {
  try { await fn(); resultados.push([true, nome]); }
  catch (e) { resultados.push([false, `${nome}: ${String(e.message).split('\n')[0]}`]); }
}

await aba.goto(base);
await aba.waitForSelector('body[data-pronto="sim"]', { timeout: 15000 });
const ids = await aba.$$eval('#diagramas option', (ops) => ops.map((o) => o.value));

await confere('o documento de exemplo abre sem erros', async () => {
  const estado = await aba.textContent('#estado');
  if (!/sem erros/.test(estado)) throw new Error(estado);
  if (ids.length < 2) throw new Error(`só ${ids.length} diagrama(s)`);
});

// O que cada diagrama de exemplo precisa ter, contado no SVG.
const esperado = {
  'tabela-1': { estatico: 6, virtual: 6, mecanico: 6, anotacao: 7 },
  'figura-4': { virtual: 2, estatico: 2, decisao: 1, juncao: 2, fluxos: 8 },
  'figura-2a': { virtual: 2, estatico: 1, mecanico: 2, decisao: 1, juncao: 2, fluxos: 10 },
};

for (const id of ids) {
  await confere(`${id}: desenha`, async () => {
    await aba.selectOption('#diagramas', id);
    await aba.waitForSelector(`svg.diagrama[data-diagrama="${id}"]`);
    const conta = await aba.$eval('svg.diagrama', (svg) => {
      const c = { fluxos: svg.querySelectorAll('[data-fluxo]').length };
      for (const g of svg.querySelectorAll('[data-tipo]')) c[g.dataset.tipo] = (c[g.dataset.tipo] ?? 0) + 1;
      return c;
    });
    for (const [k, v] of Object.entries(esperado[id] ?? {})) {
      if (conta[k] !== v) throw new Error(`${k}: esperava ${v}, veio ${conta[k] ?? 0}`);
    }
    const caixa = await aba.$eval('svg.diagrama g.elementos', (g) => {
      const b = /** @type {SVGGElement} */ (g).getBBox();
      return { w: b.width, h: b.height };
    });
    if (!(caixa.w > 50 && caixa.h > 50)) throw new Error(`desenho vazio (${caixa.w} × ${caixa.h})`);
    await (await aba.$('#tela')).screenshot({ path: path.join(capturas, `${id}.png`) });
  });
}

await confere('o inspetor mostra o lado de entrada (Figura 4)', async () => {
  await aba.goto(`${base}#figura-4`);
  await aba.waitForSelector('svg.diagrama[data-diagrama="figura-4"]');
  // a máquina vazia dentro de Não-autoaceitadorRE? recebe por cima e pela esquerda
  await aba.click('svg.diagrama [data-id="v1"] > .forma', { position: { x: 60, y: 60 } });
  const texto = await aba.textContent('#inspetor');
  if (!/como algoritmo/.test(texto) || !/como entrada/.test(texto)) throw new Error(texto);
  if (!/interface/.test(texto)) throw new Error('não mostrou a interface');
  await aba.keyboard.press('Escape');
  if (await aba.$('.selecionado')) throw new Error('Esc não limpou a seleção');
});

await confere('um clique na linha seleciona o fluxo (Figura 8)', async () => {
  await aba.goto(`${base}#figura-8`);
  await aba.waitForSelector('svg.diagrama[data-diagrama="figura-8"]');
  // um ponto no meio da linha azul que sai do topo de Não-autoaceitadorRE?
  const ponto = await aba.$eval('svg.diagrama [data-fluxo="f8"] .linha', (linha) => {
    const p = linha.getPointAtLength(linha.getTotalLength() / 2);
    const m = linha.getScreenCTM();
    return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f };
  });
  await aba.mouse.click(ponto.x, ponto.y);
  const texto = await aba.textContent('#inspetor');
  if (!/fluxo/.test(texto) || !/sai por cima, o código da máquina/.test(texto) || !/azul/.test(texto)) throw new Error(texto);
});

await confere('sem rolagem horizontal a 390 px', async () => {
  await aba.setViewportSize({ width: 390, height: 844 });
  await aba.waitForTimeout(200);
  const excesso = await aba.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (excesso > 0) throw new Error(`${excesso} px a mais`);
  await aba.screenshot({ path: path.join(capturas, 'pagina-estreita.png'), fullPage: true });
});

await confere('nenhum erro de JavaScript', async () => {
  if (erros.length) throw new Error(erros.join(' | '));
});

await navegador.close();
servidor.close();
for (const [ok, nome] of resultados) console.log(`${ok ? '✓' : '✗'} ${nome}`);
console.log(`capturas em ${path.relative(process.cwd(), capturas)}/`);
process.exit(resultados.every(([ok]) => ok) ? 0 : 1);
