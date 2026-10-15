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
fora do repositório.

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

**2026-10-12 · Respostas sobre a notação** (André). A espessura do traço não
tem significado. A cor do fluxo é decidida pelo destino: entra pela esquerda,
vermelho (a entrada permanece entrada); por cima, azul (vira código); num
componente preto sem nada dentro, preto (é incorporada). A seta pode ir em
todos os fluxos. Um valor encostado vale por uma flecha (lateral, vermelha;
no topo, azul); fica para depois. Sair pelo topo é o código da máquina tomado
como valor. `-1` e `*` são mecânicos, de cantos retos. Detalhes e as perguntas
que daí saíram em `notacao.md`.

**2026-10-12 · Cor do fluxo, saída e figuras com o que está fora** (André).
A junção é transparente: o que chega a ela tem a cor do que sai dela, e preto
se os ramos discordam. O fluxo sem destinatário (a saída da máquina) não
precisa existir; se existir, quem desenha escolhe a cor. O objeto vermelho que
recebe a saída de um componente preto é materializado por ele: flecha preta.
Reticências e Atalho são *ad hoc*, do artigo; voltam quando se pensar no
funcionamento dos diagramas. O plano da v0 foi aprovado (está no `CLAUDE.md`).

**2026-10-12 · Formato na versão 2** (Claude, a partir das respostas). A cor
do fluxo passa a ser calculada (`corDoFluxo`); saem do documento `traco`,
`seta` e o `registro` dos fluxos com destinatário. A migração 1 → 2 faz isso.
O desenho omite a seta que chega a uma junção, porque o ponto já marca a
chegada.

**2026-10-12 · O editor edita; Figuras 3 e 9 a 11 nos exemplos** (Claude, no
plano aprovado pelo André). Passos 1 a 8 da v0: edição sem tela
(`src/edicao.js`), tela, paleta, inspetor que edita, vários diagramas, `.json`,
cópia no navegador, SVG com o documento dentro. As Figuras 3 (três quadros) e
9 a 11 foram escritas à mão em `exemplos/artigo.json`, sem as reticências (9),
sem a pequena elipse com `...` (9) e sem o Atalho (10 e 11); o que estava dentro
do Atalho subiu para a máquina que o continha. Os valores encostados (`x!`,
`x`, `x-1`, o código em 9 e 11) continuam só posição.

**2026-10-12 · Sessões em vez de Projeto** (André). Os Projetos do Claude Code
ainda não estão liberados na conta. Por enquanto, cada tarefa é uma sessão
comum na nuvem com este repositório; o modo de trabalhar com o André foi para
o `CLAUDE.md`, que toda sessão lê.

**2026-10-15 · Projeto** (André). Os Projetos do Claude Code foram liberados
na conta. O trabalho volta para um Projeto com este repositório; o manuscrito e
os dois PowerPoints ficam na Library dele.
