# Decisões

Registro das decisões que mudam o rumo do projeto: quando, o quê, por quê e de
quem. A mais recente fica embaixo.

**2026-10-11 · O que é este repositório** (André). Um ambiente para criar, com a
ajuda do Claude, um editor de diagramas para a notação de *Metáforas*. O editor
depois vai para direções que ainda não se sabem; por isso precisa poder evoluir.
O material das conversas anteriores entre André e Claude não entra aqui.

**2026-10-11 · Repositório, licença, publicação** (André). Repositório público
`metaforas` no GitHub, licença CC0 1.0 (domínio público), página no GitHub Pages.
Os textos de referência (o manuscrito de *Metáforas*, o *Ensaio.pptx*) ficam
fora do repositório, na Library do Projeto.

**2026-10-11 · Onde se trabalha** (André). Num Projeto do Claude Code na nuvem:
cada tarefa é uma conversa que clona este repositório e lê o `CLAUDE.md`.

**2026-10-11 · Pilha** (André, a partir de proposta do Claude). Para começar,
aplicação web: JavaScript sem etapa de build, módulos ES do navegador, desenho
em SVG, tipos em comentários JSDoc conferidos pelo TypeScript (`tsc`, sem gerar
arquivos). Pages no modo *Deploy from a branch*, raiz do `main`. Depois que as
coisas estiverem mais claras, investigam-se outras possibilidades.

**2026-10-11 · Critério da v0** (André). Redesenhar no editor a Tabela 1 e as
Figuras 1 a 11 de *Metáforas*, dentro da gramática confirmada; salvar o
documento; exportar SVG.

**2026-10-11 · Gramática** (André). Confirmados: estático, virtual, mecânico,
decisão, junção, fluxo, lado de entrada (regra da notação), aninhamento,
anotações. Fora por enquanto: virtual tracejado (é só um virtual sem nome),
reticências, Atalho, transformação, sequências de quadros, e os acréscimos que
só aparecem no Ensaio. Detalhes em `notacao.md`.

**2026-10-12 · Estrutura antes de desenho** (Claude, proposto ao André). O
documento guarda o que cada coisa é (registro), o que está dentro do quê
(interface e objeto), por onde cada fluxo entra e sai (lado) e os nomes nos
seus dois papéis (legenda e rótulo). O desenho é calculado a partir disso,
inclusive as rotas das linhas. Assim o mesmo documento pode servir, mais tarde,
a outras coisas além do desenho. Formato na versão 1, com migrações e
preservação de campos desconhecidos (`formato.md`).

**2026-10-12 · Exemplos** (Claude). `exemplos/artigo.json` traz a Tabela 1 e as
Figuras 1, 2 (três quadros) e 4 a 8, convertidas do *Ensaio.pptx* por um script
de rascunho e ajustadas à mão. Servem de exemplo e de teste do desenho. As
Figuras 3 e 9 a 11 ficam para a v0 (a 9 tem reticências; a 10 e a 11, o Atalho).
