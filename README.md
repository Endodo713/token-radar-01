# Token Radar — which pre-token protocol launches the next big token?

An entry for make.fun's `token-radar-01` bounty ($1,325; 1st place $1,000).
It reads a sealed DefiLlama snapshot, ranks every protocol that records no token
by an implied launch value, and hands in a dashboard a reader can use: the board,
a detail view for each protocol, and the steps to farm it.

## The model (radar-2, comparables — not a fixed multiple)

```
implied = TVL × category median (FDV/TVL) × growth × maturity
```

- **Multiple:** the median FDV/TVL (`mcap_usd / tvl_usd`) of the live-token protocols
  in the same category, when at least 5 of them trade; otherwise the global median
  (0.1691× in this snapshot). Clamped to [0.02, 2.0]. Lending trades near 0.13× TVL,
  DEXes near 0.34×, liquid staking near 0.03× — one fixed multiple for all of them
  would rank a staking wrapper above a DEX of the same size, which the market does not.
- **Growth:** 7-day TVL change, clamped to −60%…+120%, moves the value by half its size.
- **Maturity:** 0.60 for a newborn to 1.00 after three years tracked with no token.
- The multiple and its source are printed on every row, so the board can be checked
  line by line. No protocol name is ever special-cased: the same function scores
  every row.

## The board

- **198 rows:** all 40 protocols on the snapshot's watchlist (TVL ≥ $50M, no token
  recorded, not a wrapped/staked/bridged product) plus every other rankable pre-token
  protocol in the snapshot — the whole pre-token universe, with wrapped, staked and
  bridged products of already-trading tokens left out (WBTC is Bitcoin on Ethereum,
  not a protocol still waiting on a launch of its own). Ranks are 1..198 with
  strictly falling implied values.
- Each row carries a **7-step farm plan** derived from the protocol's own record
  (category, chains, TVL, age), with what each step costs and how long it takes.
- The dashboard's **Live token** view lists the 24 biggest protocols that already
  trade, with their market caps — the comparables the multiples come from, kept
  apart from the ranked board.

"Pre-token" means DefiLlama's record carries no token for the protocol. It is not
proof the protocol has none, and it is not a prediction that one will be issued,
or when. Implied values are this entry's estimates from the snapshot's own figures,
never investment advice.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json|directory>
```

Node 22+, standard library only, no network. `main.ts` reads the snapshot, writes
`board.json` and `data.js`, copies `dashboard/` and `screenshots/`, and writes
`dossier.json` with the vendored make.fun library (`vendor/makefun-board.ts`).
Open `out/dashboard/index.html` in a browser (it renders offline) or serve `out/`.

## Files

- `main.ts` — entrypoint: snapshot in, board + dashboard + dossier out.
- `lib/model.ts` — the comparables model, the farm plans, the board builder.
- `vendor/makefun-board.ts` — make.fun's dossier library (copied from the kit).
- `dashboard/` — the static page: `index.html`, `app.css`, `app.js`.
- `screenshots/` — the board, a protocol detail view, a filtered view.
