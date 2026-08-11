# Modo Criança — Design System (guia oficial)

> **Status:** canônico · **Versão:** v1 (referência-base: `jogos-modo-crianca-desktop-v2.png`)
> **Escopo:** tokens, componentes e animações NOVOS do modo criança do Tá Sabido.
> O frontend implementa FIEL a este documento + às referências aprovadas. Em caso de
> dúvida entre texto e imagem, a **imagem vence** (referências canônicas no fim do doc).

---

## 0. Contexto

O modo criança é o ambiente lúdico onde a criança navega por jogos educativos.
Ele herda a linguagem "clay" do Tá Sabido (ver `globals.css` do frontend: tokens
`--clay-*`, fonte Baloo 2) e adiciona uma camada **mais doce, mais pastel e mais
grandona**: raios maiores, thumbnails coloridas, carrosséis com loop infinito e
interações táteis (hold-to-unlock, drag/swipe).

Princípios do modo criança:

1. **Tudo é grande** — alvos de toque ≥ 56px, tipografia robusta, sem texto miúdo crítico.
2. **Cores pastel nos brinquedos, cores fortes nas ações** — thumbnail = pastel;
   botão Jogar, setas e cadeado = cores vivas do clay (turquesa/azul).
3. **Zero crueldade de contraste** — títulos sempre azul-marinho escuro sobre fundo claro
   (contraste ≥ 7:1); nunca texto claro sobre pastel claro.
4. **Feedback em toda interação** — hover, press, progresso de segurar, som/partícula
   opcional no destravar (ver estados de cada componente).
5. **Sem emoji** — toda ilustração/ícone é vetorial (Phosphor ou ilustração própria).

---

## 1. Tokens novos

### 1.1 Paleta — superfícies e texto

| Token | Valor | Uso | Origem (ref) |
|---|---|---|---|
| `--kid-bg` | `#F8F6F1` | Fundo da página (creme claro texturizado) | v2 desktop / PIN |
| `--kid-card` | `#FFFDF9` | Corpo branco-quente do GameCard | v2 desktop |
| `--kid-modal` | `#FFFDF8` | Painel do PreviewModal | preview desktop |
| `--kid-key` | `#F7F2E9` | Botões do KeypadPIN (creme) | PIN mobile |
| `--kid-heading` | `#104477` | Títulos (Oi Ana!, seções, títulos de jogo, PIN) | v2 desktop |
| `--kid-muted` | `#6B6B6B` | Subtítulos e texto secundário | v2 desktop |
| `--kid-numeral` | `#075097` | Números do teclado PIN | PIN mobile |

> Variações observadas entre refs (aceitáveis, mesma família): fundo `#FCF8EF` (mobile),
> `#F8F4EC` (PIN); heading `#123B73` (mobile), `#124B7D` (preview), `#0B477F` (PIN);
> muted `#686868` (preview mobile). O frontend usa o valor da tabela; as variações
> existem só por textura/iluminação das artes.

### 1.2 Paleta — thumbnails pastel (5 cores de jogo)

Extraídas das referências. A thumbnail de cada jogo usa **uma** destas cores de fundo.

| Token | Valor | Uso |
|---|---|---|
| `--kid-thumb-turquoise` | `#48C3C7` | Jogos: Escreva seu nome, Contorne o círculo |
| `--kid-thumb-blue` | `#79B9E5` | Jogos: Desenhe o macaco (banner do preview também) |
| `--kid-thumb-coral` | `#F36A4D` | Jogos: Pinte o arco-íris, Trace o caminho |
| `--kid-thumb-yellow` | `#FFCA2B` | Jogos: Complete as formas |
| `--kid-thumb-purple` | `#9C80D0` | Jogos: Ligue os pontos, Escreva as letras |

> Variações mobile: turquesa `#55CBCD`, azul `#82B7E8`, coral `#F66A4B`,
> amarelo `#FFD52D`, roxo `#9875D1` — mesma família, tom a tom.

### 1.3 Paleta — ações e badges (cores vivas)

| Token | Valor | Uso | Origem |
|---|---|---|---|
| `--kid-turquoise` | `#12A8AF` | Setas do carrossel, PadlockButton, chevrons | v2 desktop (`#1299A1` mobile) |
| `--kid-turquoise-bright` | `#20BFC4` | Pill de categoria, badge NOVO, banner ilustração turquesa | preview + mobile |
| `--kid-task` | `#F45A2A` | Badge de tarefa (checklist) no card | mobile (v2 usa tom laranja idêntico) |
| `--kid-star` | `#FFB800` | Estrela de rating e ícones de conquista | mobile/preview (`#F5AD08` v2) |
| `--kid-purple-strong` | `#7041B8` | Ícone "Partidas" no MetricChip | preview desktop |
| `--kid-backspace` | `#145A9E` | Botão apagar do KeypadPIN | PIN mobile |
| `--kid-blue-ring` | `#0878D9` | Segmento azul do anel do cadeado (hold-to-unlock) | PIN mobile |

**Reuso do clay existente (NÃO criar token novo):**

| Token existente | Valor | Uso no modo criança |
|---|---|---|
| `--clay-blue` / `--primary` | `#0d79f0` | Botão **Jogar** (gradiente `#168DF7 → #056BD8` na arte; no CSS usa o token com leve gradiente ou cor sólida) |
| `--clay-navy` | `#002767` | Ícones do X de fechar, detalhes de destaque |
| `--clay-turquoise-dark` | `#04757b` | Hover de elementos turquesa |
| `--clay-coral` | `#f6552d` | Decorações de canto (blobs) |

### 1.4 Raios

| Token | Valor | Uso |
|---|---|---|
| `--radius-kid-card` | `24px` | GameCard (4 cantos) — na v2 o arredondamento percebido é ~16–24px; **24px é o canônico** (spec) |
| `--radius-kid-thumb` | `24px` topo / `0` base | Thumbnail: acompanha o raio do card em cima; base reta colada no corpo branco |
| `--radius-kid-pill` | `999px` | Badge NOVO, pill de categoria, chips, botões (setas, Jogar, teclado) |
| `--radius-kid-chip` | `18px` | MetricChip |
| `--radius-kid-badge-square` | `10px` | Badge de tarefa (quadrado arredondado) |

### 1.5 Sombras

| Token | Valor | Uso |
|---|---|---|
| `--shadow-kid-card` | `0 10px 24px -8px rgb(33 30 26 / 0.18)` | GameCard em repouso |
| `--shadow-kid-card-hover` | `0 18px 36px -12px rgb(33 30 26 / 0.26)` | GameCard em hover/arrastado |
| `--shadow-kid-arrow` | `0 6px 16px -6px rgb(33 30 26 / 0.22)` | Botões de seta do carrossel |
| `--shadow-kid-modal` | `0 32px 72px -24px rgb(33 30 26 / 0.4)` | PreviewModal (sobre backdrop desfocado) |
| `--shadow-kid-key` | `inset 0 3px 6px rgb(255 255 255 / 0.6), 0 6px 14px -6px rgb(33 30 26 / 0.25)` | Botões do teclado PIN (relevo clay) |

> Regra de sombra do modo criança: sombras são **mais suaves e difusas** que as do modo
> adulto — nada de bordas duras; tudo parece plástico mole (ver `.clay-blob` existente).

### 1.6 Tipografia do modo criança

Fonte única: **Baloo 2 Variable** (já carregada no frontend). Peso generoso,
nunca abaixo de 500 em texto visível.

| Papel | Tamanho | Peso | Cor | Uso |
|---|---|---|---|---|
| `kid-display` | 44px (desktop) / 34px (mobile) | 800 | `--kid-heading` | Saudação "Oi, Ana!" |
| `kid-section-title` | 28px | 700 | `--kid-heading` | "Mais jogados", "Para casa", "Jogos públicos" |
| `kid-link-all` | 17px | 700 | `--kid-turquoise` | "Ver todos →" |
| `kid-card-title` | 18px | 700 | `--kid-heading` | Título do jogo no GameCard |
| `kid-card-stats` | 13px | 600 | `--kid-muted` (contagem) / `--kid-heading` (nota) | Linha de stats do card |
| `kid-modal-title` | 30px | 800 | `--kid-heading` | Título no PreviewModal |
| `kid-modal-body` | 16px | 500 | `--kid-muted` | Tutorial do jogo |
| `kid-pill` | 14px | 700 | branco | Pill de categoria |
| `kid-chip-label` | 13px | 600 | `--kid-muted` | Rótulo do MetricChip |
| `kid-chip-value` | 20px | 800 | `--kid-heading` | Valor do MetricChip |
| `kid-play` | 22px | 800 | branco | Botão Jogar |
| `kid-pin-title` | 30px | 800 | `--kid-heading` | "Digite o PIN dos pais" |
| `kid-pin-sub` | 16px | 500 | `--kid-muted` | "Para acessar as configurações da família" |
| `kid-key-digit` | 28px | 700 | `--kid-numeral` | Dígitos do teclado |

> Baloo 2 é uma display font: não usar abaixo de 13px em nenhum cenário do modo criança.

### 1.7 Movimento (tokens de animação)

| Token | Valor | Uso |
|---|---|---|
| `--motion-kid-fast` | 150ms | Hover, press, setas |
| `--motion-kid-base` | 300ms | Crescer do modal, troca de slide |
| `--motion-kid-slow` | 600ms | Hold-to-unlock, entrada de tela |
| `--ease-kid-pop` | `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot) | Elementos que "saltam" (badges, cadeado) |
| `--ease-kid-slide` | `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out suave) | Carrossel, modal |

> Respeitar `prefers-reduced-motion`: reduzir overshoot e pular animações não essenciais
> (padrão já usado em `.animate-card-in`).

---

## 2. Componentes

### 2.1 GameCard

Card clicável do carrossel. Ao clicar, abre o PreviewModal crescendo a partir do card.

**Anatomia (de cima para baixo):**

```
┌────────────────────────────┐
│  [NOVO]  [☑]   thumbnail   │  ← 72% da altura, retangular wide
│                            │     1 canto sup. esquerdo: badge (opcional)
│                            │
├────────────────────────────┤
│  Escreva seu nome          │  ← 28% da altura, corpo branco
│  ★ 4,8   ·   2,1 mil jogadas│  ← stats em linha
└────────────────────────────┘
```

| Propriedade | Valor |
|---|---|
| Proporção do card | `1.3:1` (ex.: 280×215px desktop; ~250×190px mobile) |
| Thumbnail | **retangular wide ~1.7–1.8:1** (ex.: 280×155px), **~72% da altura do card** |
| Corpo branco | ~28% da altura (título + stats) |
| Raio | `--radius-kid-card` (24px) |
| Sombra | `--shadow-kid-card` (hover: `--shadow-kid-card-hover`) |
| Título | `kid-card-title` (18px/700), 1 linha, truncado com `…` |
| Stats | `kid-card-stats`: ★ `--kid-star` + nota `--kid-heading` + `·` + contagem `--kid-muted` ("2,1 mil jogadas") |

> ⚠️ **Correção de spec:** o briefing inicial dizia "thumbnail quadrada 1:1 ~65% da
> altura". As referências canônicas mostram thumbnail **retangular wide (~1.8:1,
> ~72%)**. Seguir a referência (v2): retangular wide. (Ver §6 Inconsistências.)

**Badges (opcionais, canto superior ESQUERDO da thumbnail):**

| Badge | Formato | Cor | Texto/ícone |
|---|---|---|---|
| `BadgeNovo` | pill (`--radius-kid-pill`) | `--kid-turquoise-bright` | texto branco "NOVO" (14px/700) |
| `BadgeTarefa` | quadrado arredondado (`--radius-kid-badge-square`) | `--kid-task` | ícone vetorial checklist branco (Phosphor `ClipboardText` / `CheckSquare`) |

> Posição canônica: **esquerdo** (v2). A referência mobile mostra o badge de tarefa à
> direita e circular — anotado como divergência; seguir v2. O badge de tarefa aparece
> nas seções "Para casa" e "Jogos públicos"; o NOVO aparece em jogos recém-publicados.

**Estados:**

| Estado | Comportamento |
|---|---|
| `idle` | Sombra `--shadow-kid-card`, sem transform |
| `hover` | Sobe 4px (`translateY(-4px)`), sombra `--shadow-kid-card-hover`, thumbnail escala 1.02 (150ms) |
| `focus-visible` | Anel de foco `2px solid var(--clay-turquoise)` com offset 3px (acessibilidade teclado) |
| `pressed` | Escala 0.97, sombra reduzida (200ms) |
| `disabled` | Opacidade 0.5, sem hover, cursor default (uso raro — todo card deve abrir o modal) |

### 2.2 CarouselInfinito

Seção horizontal com loop infinito de GameCards.

**Anatomia:**

```
Mais jogados                          Ver todos →
◀  [card][card][card][card][card]  ▶
```

| Peça | Spec |
|---|---|
| Título da seção | `kid-section-title` (28px/700), esquerda |
| "Ver todos →" | `kid-link-all` (17px/700 turquesa), direita; seta Phosphor `ArrowRight` (não é emoji) |
| Setas | círculo branco 56–60px, sombra `--shadow-kid-arrow`, chevron `--kid-turquoise` 20px (Phosphor `CaretLeft`/`CaretRight`), centradas verticalmente na fileira |
| Cards por viewport | desktop: 5 visíveis; mobile (landscape): ~2.5 visíveis (peek) |
| Gap entre cards | 32px desktop / 16px mobile |
| Loop | infinito: ao chegar no fim, volta ao início **sem salto visível** (clone/duplicação de itens ou reindexação); direção oposta no arrasto para trás |
| Drag/swipe | arrastar com dedo ou mouse move o carrossel (deslize inercial + snap por card); setas avançam 1 página (1 card por vez ou viewport cheio — consistente entre setas e swipe) |

**Estados das setas:** `idle` branco/turquesa · `hover` sobe 2px + sombra maior ·
`disabled` (no loop infinito nunca fica disabled) · `pressed` escala 0.92.
Fim de lista não existe — é loop. Durante o arrasto, as setas mantêm estado idle.

> Acessibilidade: carrossel é `region` com `aria-label` = título da seção; cards são
> botões focáveis; setas têm `aria-label` "Anterior"/"Próximo".

### 2.3 PreviewModal

Modal de detalhe do jogo. **Cresce do GameCard clicado** (transform-origin no centro
do card) sobre backdrop desfocado + escurecido.

**Anatomia:**

```
┌──────────────────────────────────┐  ✕ (botão fechar, círculo, canto sup. dir.)
│ ▓▓▓▓▓ banner ilustração ▓▓▓▓▓▓  │  ← ~1/3 da altura do modal
│ ▓▓▓▓▓ (fundo = cor pastel do    │     cor pastel do jogo + ilustração +
│ ▓▓▓▓▓  jogo + arte + decorações)│     estrelas/formas decorativas
├──────────────────────────────────┤
│  Desenhe o macaco      [Coordenação motora]
│  Tutorial em 1–2 linhas (cinza)
│  [⏱ 12 min] [▥ 2,1 mil] [★ 87%]  │  ← 3 MetricChips em linha
│  ┌────────────────────────────┐  │
│  │  ▶  Jogar                 │  │  ← botão full-width
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

| Propriedade | Valor |
|---|---|
| Largura | min(640px, 92vw) desktop; ~92vw mobile |
| Raio | `--radius-kid-card` (24px) |
| Fundo | `--kid-modal` |
| Sombra | `--shadow-kid-modal` |
| Banner | ~1/3 da altura do modal; fundo = **cor pastel do jogo** (`--kid-thumb-*`); altura mínima 140px |
| Fechar | círculo 40px branco (`--kid-modal`), X `--clay-navy` 18px, canto sup. direito, 8px de offset da borda |
| Título | `kid-modal-title` (30px/800) |
| Pill categoria | `--radius-kid-pill`, fundo `--kid-turquoise-bright`, texto branco 14px/700 (ex.: "Coordenação motora", "Escrita") |
| Tutorial | `kid-modal-body`, 1–2 linhas, `text-wrap: pretty` |
| MetricChips | 3 em linha (desktop) / empilhados ou 1 linha compacta (mobile) — ver 2.4 |
| Botão Jogar | full-width, `--clay-blue` (gradiente sutil `#168DF7→#056BD8` ou cor sólida), texto branco `kid-play` (22px/800), raio pill, ícone play branco em círculo translúcido à esquerda; altura 64px desktop / 60px mobile |

**Estados do botão Jogar:** `idle` gradiente azul · `hover` brilho `+8%` no gradiente +
sobe 2px · `pressed` escala 0.97 · `focus-visible` anel branco 2px offset 3px
(sobre fundo azul) · `loading` (se existir fluxo de entrar no jogo): spinner branco
no lugar do play.

**Estados do modal:** `entrando` (cresce 0.9→1 + fade 0→1, 300ms, `--ease-kid-pop`) ·
`aberto` · `fechando` (encolhe para o card de origem, 250ms) · backdrop `rgba(33 30 26
/ 0.45)` + `backdrop-filter: blur(6px)`.

> Clique no backdrop fecha. `Esc` fecha (acessibilidade). Foco entra no modal ao abrir
> e volta ao card de origem ao fechar. `role="dialog"` + `aria-modal="true"`.

### 2.4 MetricChip

Chip de estatística usado dentro do PreviewModal (3 por jogo: Tempo médio, Partidas,
Pontuação média).

| Propriedade | Valor |
|---|---|
| Anatomia | ícone clay 28px + rótulo (13px/600 `--kid-muted`) + valor (20px/800 `--kid-heading`) |
| Formato | pill (`--radius-kid-chip` 18px), fundo branco, sombra `--shadow-kid-card` (suave) |
| Altura | 64px (ícone à esquerda, textos à direita) |
| Ícones | Phosphor: `Clock` (turquesa `--kid-turquoise`), `ChartBar`/`ChartBarHorizontal` (multicor: turquesa/laranja/roxo — base `--kid-purple-strong`), `Star` (`--kid-star`) |
| Conteúdo | rótulo: "Tempo médio" / "Partidas" / "Pontuação média" · valor: "12 min" / "2,1 mil" / "87%" |
| Estados | `idle` estático · `hover` (não-interativo: apenas escala sutil 1.02 para consistência tátil) — chips **não são clicáveis** |

### 2.5 KeypadPIN

Tela de PIN dos pais (6 dígitos). Usada para acessar configurações da família.

**Anatomia (portrait):**

```
        🔒  (cadeado com anel de progresso)
   Digite o PIN dos pais
   Para acessar as configurações da família
      ○ ● ● ○ ○ ○        ← 6 dots (● preenchido turquesa)
   1   2   3
   4   5   6
   7   8   9
   (vazio)  0  ⌫
```

| Propriedade | Valor |
|---|---|
| Dots | 6 (PIN de **6 dígitos** — regra do usuário); círculo 16px; preenchido `--kid-turquoise` / vazio = contorno turquesa com interior creme |
| Teclado | grid 4×3, botões circulares 64–72px (`--radius-kid-pill`), fundo `--kid-key`, relevo `--shadow-kid-key`, dígitos `kid-key-digit` (28px/700 `--kid-numeral`) |
| Linha 4 | posição 1 vazia (placeholder), 0 ao centro, backspace `--kid-backspace` com ícone branco (Phosphor `Backspace`/`X`) |
| Cadeado | ilustração clay turquesa (`--kid-turquoise`→`--clay-turquoise-dark`), com anel de progresso segmentado (creme `#F3EEE5` / turquesa `#0DBEC0` / azul `--kid-blue-ring`) — ver 2.6 |
| Decorações | blobs turquesa/coral nos cantos, estrelas roxa/amarela, tracinhos — herdam a linguagem clay |

**Estados:**

| Estado | Comportamento |
|---|---|
| `digitando` | dígito pressionado: escala 0.92 + sombra reduzida (100ms); dot correspondente preenche (150ms pop) |
| `erro` | dots tremem (2× 80ms horizontal) e ficam `--clay-coral` por 400ms; feedback de áudio/vibração opcional; entrada é limpa |
| `sucesso` | dots preenchem com pop escalonado (60ms de delay entre eles), cadeado destrava (ver animação hold-to-unlock), navega para configurações |
| `backspace` | remove último dot com fade-out |

> PIN nunca é exibido como texto — só dots. `inputMode="numeric"`, `maxLength=6`,
> autocomplete desativado.

### 2.6 PadlockButton

Botão discreto de cadeado no header (canto superior direito) — abre a tela de PIN.

| Propriedade | Valor |
|---|---|
| Anatomia | quadrado 44px, raio 14px, fundo transparente (ou `--kid-turquoise` 12% translúcido), ícone Phosphor `Lock` 22px `--kid-turquoise` |
| Alvo de toque | 44px mínimo (cabe no header compacto) |

**Estados (máquina de 3 estados):**

```
idle ──(clique pressionado e segurar)──► segurando ──(anel completa, ~600ms)──► destravado
  ▲                                                                              │
  └───────────────────(solta antes do fim / PIN aberto)──────────────────────────┘
```

| Estado | Visual |
|---|---|
| `idle` | cadeado turquesa sobre quadrado discreto |
| `segurando` | anel de progresso circular ao redor do cadeado preenchendo de 0→100% (`--kid-turquoise`→`--kid-blue-ring`), 600ms linear; cadeado "balança" levemente (2° oscilação) |
| `destravado` | cadeado abre (Phosphor `LockOpen`), pop `--ease-kid-pop` 300ms, brilho turquesa; após 1.2s volta ao idle (ou navega para o PIN) |

> Alternativa aceita: clique simples abre a tela de PIN direto e o hold-to-unlock vive
> no cadeado grande da tela PIN (ver animação §3.2). O frontend escolhe UMA via e
> mantém a máquina de estados documentada aqui.

---

## 3. Animações (direção, não código)

### 3.1 PreviewModal cresce do card

- Gatilho: clique no GameCard.
- Direção: o modal surge **do centro do card** (transform-origin no card), escala
  `0.9 → 1` + opacidade `0 → 1`, 300ms, `--ease-kid-pop` (leve overshoot no fim).
- Backdrop: fade + blur (6px) simultâneos, 250ms.
- Fechar: inverso — modal encolhe de volta ao card de origem, 250ms, `--ease-kid-slide`.

### 3.2 Hold-to-unlock (cadeado)

- Gatilho: manter pressionado o PadlockButton (ou o cadeado da tela PIN).
- Direção: anel segmentado ao redor do cadeado preenche no sentido horário, 600ms;
  ao completar, o cadeado **abre** com pop (overshoot) e o arco completa a volta.
- Se soltar antes: anel reverte (encolhe) em 200ms; sem punição visual.
- Duração total: 600ms (curta o bastante para criança, longa o bastante para evitar
  acidental — regra de segurança parental).

### 3.3 Rotação horizontal → vertical na tela PIN

- A tela de jogos é **fixa em horizontal (landscape)** — regra do usuário.
- Ao abrir o PIN, o dispositivo/tela rotaciona para **vertical (portrait)** (a tela
  do PIN é portrait nas refs).
- Direção: o teclado e o conteúdo giram 90° com o dispositivo (transição de layout
  nativa do SO/browser, sem recorte); dots e cadeado **não perdem estado** durante a
  rotação (dígitos já digitados permanecem preenchidos).
- Mobile: o PIN ocupa a viewport inteira (sem header); desktop: centralizado em card.

### 3.4 Carrossel em loop

- Direção: drag/swipe com inércia + snap; setas movem suave (`--ease-kid-slide`, 300ms).
- Loop: transição do último para o primeiro item sem "pulo" — duplica os cards das
  pontas e reposiciona no meio do clone (padrão de carrossel infinito).

### 3.5 Micro-animações

- Badges (NOVO/tarefa): entram com pop no mount do card (150ms, `--ease-kid-pop`).
- Estrela de rating: sutil pulso 1.2× a cada 3s (opcional, apenas se não incomodar).
- Botão Jogar: brilho animado suave no hover.

> Tudo respeita `prefers-reduced-motion` (§1.7).

---

## 4. Regras do usuário (imutáveis)

1. **SEM estrela/level badge** — o badge com o número "12" foi **removido** do modo
   criança. ⚠️ A referência v2 e a mobile ainda mostram a estrela com "12" ao lado da
   saudação: **ignorar** — é arte desatualizada. O frontend NÃO implementa.
2. **SEM emoji** — ícones e ilustrações são vetoriais (Phosphor + artes próprias).
3. **Horizontal fixo no modo criança** — a tela de jogos trava em landscape; exceção:
   a tela de PIN gira para vertical (portrait) (§3.3).
4. **PIN com 6 dígitos** — 6 dots, 6 entradas, nada de 4.
5. **Texto sempre pt-BR** — inclusive microcopy de estados (aria-labels, mensagens
   de erro do PIN, tooltips). Nada de inglês em UI.

---

## 5. Padrões de implementação (frontend)

- Tokens novos entram no `@theme inline` do `globals.css` com prefixo `kid-`
  (mesmo padrão dos `--clay-*` existentes).
- Ícones: `@phosphor-icons/react` (já dependência do projeto) — nunca emoji, nunca
  SVG inline improvisado fora do Phosphor/artes.
- Componentes novos: `GameCard`, `CarouselInfinito`, `PreviewModal`, `MetricChip`,
  `KeypadPIN`, `PadlockButton` — em `frontend/src/components/`, seguindo o padrão
  shadcn do projeto (cva + tailwind-merge).
- Rotas novas: página de jogos (landscape fixo), modal do jogo, tela de PIN —
  conforme o router do frontend (TanStack Router).
- Acessibilidade: alvos ≥ 44px (56px em áreas de toque primárias), contraste
  `--kid-heading` sobre `--kid-card` ≥ 7:1, focus visível em tudo, carrossel com
  `aria-label`, modal com `role="dialog"`.

---

## 6. Inconsistências encontradas entre referências (registro)

| # | Divergência | Decisão canônica |
|---|---|---|
| 1 | Thumbnail do card: spec dizia "quadrada 1:1 ~65%"; refs mostram **retangular wide ~1.8:1 ~72%** | **Retangular wide** (seguir v2) |
| 2 | Badge de tarefa: v2 = canto **superior esquerdo**, quadrado arredondado; mobile = canto **superior direito**, circular | **Superior esquerdo, quadrado arredondado** (seguir v2, mais recente) |
| 3 | Raio do card: medição visual ~16–20px vs spec 24px | **24px canônico** (spec); frontend pode afinar até 20px se 24px parecer exagerado na tela real — registrar decisão |
| 4 | Cards por viewport: 5 (desktop v2) vs 6 (mobile landscape) | 5 desktop / ~2.5 mobile com peek — responsivo do carrossel, não conflito |
| 5 | Badge "12" (estrela de nível) presente nas refs | **Removido por regra do usuário** — não implementar (§4.1) |
| 6 | Fundo do banner do PreviewModal: azul (`#69B9EE`, macaco) vs turquesa (`#20C2C2`, letra T) | Cor do banner = **cor pastel do jogo** (`--kid-thumb-*`); cada jogo usa a sua |

---

## 7. Referências canônicas

| Arquivo | Uso |
|---|---|
| `~/dev/projects/.tasabido-references/jogos/jogos-modo-crianca-desktop-v2.png` | Tela de jogos desktop — **base principal (v2)** |
| `~/dev/projects/.tasabido-references/jogos/jogos-modo-crianca-mobile-horizontal.png` | Tela de jogos mobile landscape |
| `~/dev/projects/.tasabido-references/jogos/preview-jogo-desktop.png` | PreviewModal desktop |
| `~/dev/projects/.tasabido-references/jogos/preview-jogo-mobile.png` | PreviewModal mobile |
| `~/dev/projects/.tasabido-references/jogos/pin-dos-pais-mobile.png` | Tela de PIN (6 dígitos, portrait) |

Qualquer alteração visual futura nas refs **invalida** este doc parcialmente — atualizar
o doc junto (versionar com `v2`, `v3`… no topo).
