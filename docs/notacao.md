# A notação

A notação é a do manuscrito *Metáforas para explicar a computação como ciência
empírica*, de André Souza Lemos (2023). Os desenhos originais foram feitos no
PowerPoint (*Ensaio.pptx*). O manuscrito e o Ensaio não estão neste repositório;
ficam na Library do Projeto.

Este arquivo registra a gramática que o André confirmou em 11 de outubro de 2026,
o que ficou de fora por enquanto e as perguntas que a leitura dos desenhos
originais deixou. Mudanças na notação passam pelo André.

## O que os diagramas são

Não são especificação nem programa. O artigo diz: "Alguém poderia pensar em tomar
os diagramas que apresentamos aqui como especificações de sistemas, ou – pior –
como código de programação, que mereceria uma 'interpretação operacional'. Não é
o caso." São "como a projeção em três dimensões de um objeto de quatro dimensões
ou mais". A versão inicial do artigo fala em uma notação "no nível de um
*Gedankenexperiment*", que permita explorar a experiência computacional "de
maneira construtiva, mas não tipicamente atualizável".

Para o editor, isso quer dizer: o documento guarda a estrutura do desenho, mas
não lhe dá semântica de execução.

## Os três registros

O artigo chama de registros as três instâncias (estático, mecânico, virtual).
Cada registro tem uma cor e uma forma, sempre juntas:

| Registro | Desenho | O que é |
|---|---|---|
| estático | elipse vermelha | código ou valor em posição de inércia: "Em vermelho, x é um valor concreto, em forma estática" |
| virtual | retângulo azul de cantos arredondados | a máquina virtual, que "emerge no tempo, em virtude da ação que desencadeia a execução do algoritmo" |
| mecânico | retângulo preto | "as constantes e operadores que estão incorporados em alguma parte mecânica do processo"; a arquitetura (M na Figura 1) |

Na versão inicial do artigo, os mesmos três apareciam como R (representação,
vermelho), V (virtual, azul) e A (atualidade, preto).

O registro é relativo: diz a posição de um componente na relação com outro
("todo componente de código que estiver, na relação com um outro componente, na
posição de inércia, de passividade", na versão inicial). O mesmo código pode
aparecer como elipse num desenho e como máquina virtual no seguinte (Figuras 5 e 6).

## Aninhamento

Um elemento dentro de outro: "uma das duas instâncias vai servir de interface da
outra, que aparece como objeto" (Tabela 1, *Objetos e interfaces*). As nove
combinações dos três registros valem. No editor, quem está dentro guarda o `pai`.

## Nomes

O artigo distingue dois papéis para os nomes:

- **legenda**: o nome da máquina (Fatorial, Não-autoaceitadorRE?, M). "Esse nome
  está presente no diagrama como uma espécie de legenda. Sua única função é
  informar o leitor." Fica no canto superior direito, na cor do registro.
- **rótulo**: "Os demais nomes que aparecem no diagrama (x, x-1, n, s, -1, etc.)
  têm um papel um pouco diferente. Eles integram os objetos que estão em cena –
  embora não nessa forma." Fica no centro.

Nos desenhos, os nomes são em Courier New negrito.

## Decisão

Losango preto, com `?` ou `=1` dentro. As saídas saem pelos vértices de cima e de
baixo e levam os rótulos `s` e `n`. A entrada chega pelo vértice da esquerda.

## Junção

Ponto preto. Divide um fluxo em dois, ou junta dois num.

## Fluxo

Linha fina, de ângulos retos, com ponta de seta aberta. Liga um lado de um
elemento a um lado de outro. Pode atravessar a borda de uma interface: a entrada
chega pela borda esquerda da máquina e a saída sai pela direita.

## Lado de entrada (regra da notação)

Numa máquina virtual, o lado por onde se entra diz como se entra:

- **por cima, como algoritmo**: o código passa a ser a máquina;
- **pela esquerda, como entrada**.

Figura 4: a máquina vazia recebe o mesmo código "simultaneamente como algoritmo e
como entrada", por cima e pela esquerda.

## Anotações

Texto para quem lê, como `(x>1)` no canto da máquina (Figura 2). Nos desenhos, em
fonte serifada.

## Fora por enquanto

Decisão do André, em 11 de outubro de 2026:

- **Virtual tracejado** (Figura 1): é só um virtual sem nome; o tracejado foi para
  ajudar a ler o artigo. No editor, é um virtual sem legenda.
- **Reticências** (Figura 9): notação *ad hoc*, do artigo.
- **Atalho** (roxo, com o sinal de proibido; Figuras 10 e 11): o sinal representa
  o "direito" que o Atalho tem de parar a computação. Fica para depois.
- **Transformação** (a seta larga da Figura 1). Fica para depois.
- **Sequências de quadros** (Figuras 2 e 3, e 4 a 9 em sequência): ficam para
  quando se pensar num executor, "que vai ser um desafio, por si só". Por
  enquanto, cada quadro é um diagrama.
- Os acréscimos que só aparecem no Ensaio (Para, Vazia?, runComTempoLimitado,
  EnumeraA, event handler, o trapézio, o octógono roxo, formas mistas como o
  retângulo arredondado vermelho ou preto) são sugestões e ficam de fora.

## Respostas de 12 de outubro de 2026

O André respondeu às seis perguntas que saíram da leitura do *Ensaio.pptx*.
O editor ainda faz o que fazia antes (entre parênteses, em cada uma); as
mudanças entram no passo 0 do plano da v0.

1. **Espessura do traço.** Não tem significado específico. (O editor aceita
   `"traco": "fino"`.)
2. **Cor do fluxo.** A cor concorda com o uso, e é o **destino** que decide:
   - a conexão entra pela **esquerda** do objeto de destino: a entrada
     permanece entrada, **vermelho**;
   - entra **por cima**: a entrada se converte em código, **azul**;
   - entra num **componente preto sem nada dentro**: é incorporada a ele,
     **preto**.

   (O editor guarda um `registro` opcional no fluxo; sem ele, azul pelo topo
   de virtual, preto no resto.)
3. **Pontas de seta.** A falta de seta entre a decisão e `n`/`s` foi só uma
   opção ao escrever o artigo; a seta pode ser introduzida. (O editor aceita
   `"seta": false`.)
4. **Encostar.** Um valor encostado num lado de outro objeto, sem linha, vale
   como se houvesse ali uma flecha: vermelha se o contato é lateral, azul se
   é com o topo. A representação sem flecha pode ficar para depois, a não ser
   que seja trivial. (Por enquanto, é só posição.)
5. **Saída pelo topo.** Sim: o fluxo que sai pelo topo de uma máquina é o
   código da máquina, tomado como valor (Figura 8).
6. **Operadores.** `-1` e `*` são mecânicos, retângulos de cantos retos: a
   flecha de entrada quer dizer que o que for recebido será incorporado a eles
   (e pode ser jogado fora ou aproveitado), que eles estão sendo acionados e
   vão produzir o comportamento esperado na sua saída.

## Perguntas em aberto

Saíram das respostas acima, aplicadas às figuras.

1. **Cor do fluxo que chega a uma junção.** A junção é preta e sem nada dentro,
   mas não incorpora: só divide. Nas Figuras 4, 5 e 8, a entrada chega a uma
   junção e se divide em duas, uma que entra por cima (azul) e outra pela
   esquerda (vermelha). O trecho antes da junção tem que cor? (Proposta:
   a junção é transparente; vale a cor do que sai dela, e preto se os ramos
   discordarem.)
2. **Cor do fluxo que sai da máquina.** O resultado que sai pela borda direita
   da máquina (Fatorial, Não-autoaceitadorRE?) não entra em nenhum objeto.
   Que cor? (Proposta: preto.)
3. **A regra vale para qualquer destino?** Na Figura 2, a saída de `-1` entra
   pela esquerda do Fatorial interno (primeiro quadro) e pela esquerda da
   elipse `x-1` (segundo quadro); pela regra, as duas seriam vermelhas, mas no
   artigo não são. É isso? E o que
   chega a uma decisão (preta, sem nada dentro) é preto?
4. **Figuras 9 a 11 na v0.** O critério da v0 pede as Figuras 1 a 11 dentro da
   gramática confirmada, mas a 9 tem reticências e a 10 e a 11, o Atalho, que
   estão fora. Redesenhamos sem eles (deixando o lugar vazio), ou o Atalho e as
   reticências entram na v0?
