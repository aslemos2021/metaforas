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
  'figura-9': { virtual: 3, estatico: 6, decisao: 2, juncao: 4, fluxos: 19 },
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

// Edição, numa aba nova e com o navegador limpo.

const ctxEdicao = await navegador.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const ed = await ctxEdicao.newPage();
ed.on('pageerror', (e) => erros.push(e.message));
ed.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
await ed.goto(`${base}#figura-4`);
await ed.waitForSelector('body[data-pronto="sim"]');

/** O documento como está guardado no navegador. */
const guardado = () => ed.evaluate(() => JSON.parse(localStorage.getItem('metaforas:documento')));
/** O diagrama mostrado, no documento guardado. */
const mostrado = async () => {
  const doc = await guardado();
  const id = await ed.$eval('svg.diagrama', (s) => s.dataset.diagrama);
  return doc.diagramas.find((d) => d.id === id);
};
/** Ponto do desenho -> ponto da tela. */
const naTela = (x, y) => ed.$eval('svg.diagrama', (s, [x, y]) => {
  const m = s.getScreenCTM();
  return { x: x * m.a + y * m.c + m.e, y: x * m.b + y * m.d + m.f };
}, [x, y]);
const clica = async (x, y) => { const p = await naTela(x, y); await ed.mouse.click(p.x, p.y); };
const arrasta = async (de, para) => {
  const a = await naTela(de.x, de.y);
  const b = await naTela(para.x, para.y);
  await ed.mouse.move(a.x, a.y);
  await ed.mouse.down();
  await ed.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await ed.mouse.move(b.x, b.y, { steps: 4 });
  await ed.mouse.up();
};
const cria = async (tipo, x, y) => {
  await ed.click(`.paleta [data-tipo="${tipo}"]`);
  await clica(x, y);
};
const PADRAO = { virtual: [200, 150], mecanico: [46, 40], estatico: [70, 46] };
const elemento = async (pred) => {
  const e = (await mostrado()).elementos.find(pred);
  return e && { ...e, w: e.w ?? PADRAO[e.tipo]?.[0], h: e.h ?? PADRAO[e.tipo]?.[1] };
};

await confere('edição: diagrama novo, e criar pela paleta, dentro e fora', async () => {
  await ed.click('#diagrama-novo');
  if ((await mostrado()).elementos.length) throw new Error('o diagrama novo não está vazio');
  await cria('virtual', 400, 250);
  await ed.fill('#inspetor [name="legenda"]', 'Fatorial');
  await ed.press('#inspetor [name="legenda"]', 'Tab');
  const v = await elemento((e) => e.tipo === 'virtual');
  if (v?.legenda !== 'Fatorial') throw new Error(JSON.stringify(v));
  if (!(await ed.textContent('svg.diagrama')).includes('Fatorial')) throw new Error('a legenda não foi desenhada');
  await cria('mecanico', 400, 250);
  const m = await elemento((e) => e.tipo === 'mecanico');
  if (m?.pai !== v.id) throw new Error(`o mecânico deveria estar dentro da máquina: ${JSON.stringify(m)}`);
  await cria('estatico', 150, 250);
  const x = await elemento((e) => e.tipo === 'estatico');
  if (x?.pai) throw new Error('o estático deveria estar fora');
});

await confere('edição: arrastar para dentro aninha; para fora, desaninha', async () => {
  const x = await elemento((e) => e.tipo === 'estatico');
  await arrasta({ x: 150, y: 250 }, { x: 360, y: 300 });
  const dentro = await elemento((e) => e.id === x.id);
  if (!dentro.pai) throw new Error(`não aninhou: ${JSON.stringify(dentro)}`);
  await arrasta({ x: 360, y: 300 }, { x: 150, y: 250 });
  const fora = await elemento((e) => e.id === x.id);
  if (fora.pai) throw new Error(`não desaninhou: ${JSON.stringify(fora)}`);
});

await confere('edição: mover a máquina leva o que está dentro', async () => {
  const antes = await elemento((e) => e.tipo === 'mecanico');
  const v = await elemento((e) => e.tipo === 'virtual');
  await arrasta({ x: v.x + 20, y: v.y + 60 }, { x: v.x + 40, y: v.y + 80 });
  const depois = await elemento((e) => e.tipo === 'virtual');
  const m = await elemento((e) => e.tipo === 'mecanico');
  if (depois.x !== v.x + 20 || depois.y !== v.y + 20) throw new Error(`moveu errado: ${JSON.stringify(depois)}`);
  if (m.x !== antes.x || m.pai !== v.id) throw new Error('o mecânico perdeu o lugar na interface');
});

await confere('edição: ligar arrastando de um lado a outro; o destino decide a cor', async () => {
  const x = await elemento((e) => e.tipo === 'estatico');
  const m = await elemento((e) => e.tipo === 'mecanico');
  const v = await elemento((e) => e.tipo === 'virtual');
  await clica(x.x + 35, x.y + 23);
  const sobre = await naTela(x.x + 35, x.y + 23);
  await ed.mouse.move(sobre.x, sobre.y);
  const porta = await ed.$('.sobreposicao [data-porta="direita"]');
  if (!porta) throw new Error('não apareceram os pontos dos lados');
  const pp = await porta.boundingBox();
  const mx = v.x + m.x, my = v.y + m.y;
  const alvo = await naTela(mx + 2, my + 20);
  await ed.mouse.move(pp.x + pp.width / 2, pp.y + pp.height / 2);
  await ed.mouse.down();
  await ed.mouse.move(alvo.x, alvo.y, { steps: 6 });
  await ed.mouse.up();
  const d = await mostrado();
  const f = d.fluxos[0];
  if (!f || f.de.elemento !== x.id || f.para.elemento !== m.id || f.para.lado !== 'esquerda') throw new Error(JSON.stringify(d.fluxos));
  const reg = await ed.$eval(`[data-fluxo="${f.id}"]`, (g) => g.dataset.registro);
  if (reg !== 'mecanico') throw new Error(`entrar num mecânico vazio deveria ser preto, veio ${reg}`);
  if (!/incorporado/.test(await ed.textContent('#inspetor'))) throw new Error('o inspetor não explicou a cor');
});

await confere('edição: desfazer e refazer', async () => {
  await ed.keyboard.press('Escape');
  await ed.keyboard.press('Control+z');
  if ((await mostrado()).fluxos.length) throw new Error('não desfez o fluxo');
  await ed.keyboard.press('Control+Shift+z');
  if ((await mostrado()).fluxos.length !== 1) throw new Error('não refez o fluxo');
});

await confere('edição: redimensionar pelo canto', async () => {
  const v = await elemento((e) => e.tipo === 'virtual');
  await clica(v.x + 10, v.y + v.h / 2);
  const canto = await ed.$('.sobreposicao [data-alca="se"]');
  if (!canto) throw new Error('não apareceram os cantos');
  const c = await canto.boundingBox();
  const p = await naTela(v.x + v.w + 60, v.y + v.h + 40);
  await ed.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await ed.mouse.down();
  await ed.mouse.move(p.x, p.y, { steps: 5 });
  await ed.mouse.up();
  const depois = await elemento((e) => e.id === v.id);
  if (Math.abs(depois.w - (v.w + 60)) > 2 || Math.abs(depois.h - (v.h + 40)) > 2) throw new Error(JSON.stringify(depois));
  await ed.screenshot({ path: path.join(capturas, 'edicao.png') });
});

await confere('edição: apagar leva os fluxos junto', async () => {
  const m = await elemento((e) => e.tipo === 'mecanico');
  const v = await elemento((e) => e.tipo === 'virtual');
  await clica(v.x + m.x + 20, v.y + m.y + 20);
  await ed.keyboard.press('Delete');
  const d = await mostrado();
  if (d.elementos.some((e) => e.id === m.id) || d.fluxos.length) throw new Error(JSON.stringify(d));
});

await confere('arquivo: exportar SVG com o documento dentro, e reabri-lo', async () => {
  const [baixado] = await Promise.all([ed.waitForEvent('download'), ed.click('#exportar')]);
  const caminho = await baixado.path();
  const { readFile } = await import('node:fs/promises');
  const texto = await readFile(caminho, 'utf8');
  if (!/<metadata id="metaforas-documento"/.test(texto)) throw new Error('falta o documento no SVG');
  if (/sobreposicao|data-auxiliar/.test(texto)) throw new Error('a camada de edição foi para o SVG');
  const id = await ed.$eval('svg.diagrama', (s) => s.dataset.diagrama);
  await ed.click('#novo');
  if ((await guardado()).diagramas.length !== 1) throw new Error('Novo não limpou');
  await ed.setInputFiles('#arquivo', caminho);
  await ed.waitForFunction((id) => document.querySelector('svg.diagrama')?.dataset.diagrama === id, id);
  if ((await guardado()).diagramas.length < 16) throw new Error('não voltou o documento inteiro');
});

await confere('arquivo: salvar .json, e o trabalho fica no navegador', async () => {
  const [baixado] = await Promise.all([ed.waitForEvent('download'), ed.click('#salvar')]);
  const { readFile } = await import('node:fs/promises');
  const doc = JSON.parse(await readFile(await baixado.path(), 'utf8'));
  if (doc.formato !== 'metaforas' || doc.versao !== 2) throw new Error('não é um documento');
  await ed.reload();
  await ed.waitForSelector('body[data-pronto="sim"]');
  if ((await guardado()).diagramas.length !== doc.diagramas.length) throw new Error('perdeu o trabalho ao recarregar');
});

await ctxEdicao.close();

await confere('nenhum erro de JavaScript', async () => {
  if (erros.length) throw new Error(erros.join(' | '));
});

await navegador.close();
servidor.close();
for (const [ok, nome] of resultados) console.log(`${ok ? '✓' : '✗'} ${nome}`);
console.log(`capturas em ${path.relative(process.cwd(), capturas)}/`);
process.exit(resultados.every(([ok]) => ok) ? 0 : 1);
