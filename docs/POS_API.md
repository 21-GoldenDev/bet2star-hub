# POS API Reference

Base URL: `{origin}/api/pos`

All POS endpoints (except **Login**) require:

```http
Authorization: Bearer <token>
```

Tokens are issued by **Login** and expire after **24 hours**. Disabling a terminal in admin immediately blocks authenticated calls even if the token has not expired.

CORS is enabled (`Access-Control-Allow-Origin: *`). Both `GET` and `POST` are accepted on most endpoints (JSON body and/or query params).

---

## Authentication

### Login

`POST /api/pos/login`  
`GET /api/pos/login` (query params)

**Auth:** none

**Request**

| Field | Aliases | Required | Description |
|-------|---------|----------|-------------|
| `serial_number` | `serialNumber`, `tsn`, `TSN` | yes | Terminal serial number |
| `password` | `pin` | yes | Terminal password |

```json
{
  "serial_number": "346346346346aa",
  "password": "346346346"
}
```

**Success `200`**

```json
{
  "success": true,
  "data": {
    "token": "<signed-token>",
    "terminal": { "id": "...", "serial_number": "..." },
    "agent": {
      "id": "...",
      "username": "...",
      "first_name": "...",
      "last_name": "...",
      "status": "active"
    },
    "credit_limit": 50000,
    "max_stake": 2000000,
    "allowed_products": ["lotto", "pools", "sports", "sports_draw"],
    "prizes": {
      "active": [
        {
          "prize_id": "...",
          "name": "Prize A",
          "commission": 100,
          "default": true,
          "status": "active"
        }
      ],
      "default": { "prize_id": "...", "name": "Prize A", "commission": 100, "default": true, "status": "active" }
    },
    "status": "active"
  }
}
```

**Errors**

| Status | Body | When |
|--------|------|------|
| `400` | `{ "error": "Serial number and password are required." }` | Missing fields |
| `401` | `{ "error": "Invalid serial number or password." }` | Bad credentials / unknown TSN |
| `401` | `{ "error": "Terminal is inactive." }` | Terminal status ≠ `active` |
| `401` | `{ "error": "Assigned agent is inactive." }` | Agent disabled |

---

### Session / Me

`GET /api/pos/me`

**Auth:** Bearer token required

Returns current terminal credit, products, prizes, and agent (same shape as login `data` without `token`). Use after login or periodically to refresh credit / config.

---

## Common auth errors (all protected routes)

| Status | Error |
|--------|-------|
| `401` | `Authorization Bearer token is required.` |
| `401` | `Invalid or expired token.` |
| `401` | `Terminal is inactive.` |
| `403` | `Serial number does not match authenticated terminal.` |

On bet endpoints, if the body includes `tsn` / `serial_number`, it must match the authenticated terminal. Otherwise TSN is taken from the token.

---

## Active games & fixtures

`GET /api/pos/{product}/active`

**Auth:** required

**`product` values**

| Path value | Game type |
|------------|-----------|
| `lotto` | lotto |
| `pools` | pools |
| `sports` | sports |
| `sports-draw` | sports_draw (Football Pools) |
| `footballpools` | alias of `sports-draw` |

**Success**

```json
{
  "success": true,
  "data": {
    "game": {
      "id": "...",
      "type": "sports",
      "week": 12,
      "start_time": "...",
      "end_time": "...",
      "visible_numbers": [1, 2, 3],
      "prizes": [{ "id": "...", "name": "..." }]
    },
    "fixtures": []
  }
}
```

- **lotto:** `fixtures` is `[]`; use `visible_numbers` for available ball numbers. `prizes` lists game prizes.
- **pools:** `fixtures` = enabled week matches from `matches`.
- **sports / sports-draw:** `fixtures` = rows from `sports` for that game (includes odds/`prizes` per match).

If no active game: `{ "game": null, "fixtures": [] }`.

---

## Lotto

### Place bet — `POST /api/pos/lotto/bet`

**Auth:** required

| Field | Aliases | Required | Notes |
|-------|---------|----------|-------|
| `gameMode` | `game_mode`, `gameType` | yes | See modes below |
| `stake` | `staked`, `betAmount` | yes | Deducted from terminal credit |
| `under` | `matchAtLeast` | mode-dependent | Array of integers |
| `numbers` | `selectedNumbers` | mode-dependent | Array or grouped object |
| `prize` | `prize_id`, `prizeId` | recommended | Defaults to terminal default prize |
| `gameId` | `game_id` | no | Defaults to current active lotto game |
| `tsn` | `serial_number` | no | Must match token if sent |

**Modes (`gameMode`)**

| Mode | `numbers` | `under` |
|------|-----------|---------|
| `nap_perm` | `number[]` | required |
| `turbo` | `number[]` | usually `[n]` |
| `under1` / `under2` | `number[]` | optional |
| `grouping` | object `{ "u-id": number[] }` | total under |
| `one_banker` | single number / array → auto-expands to groupA/groupB | typically `[2]` |
| `two_banker` | object or pre-shaped groups | yes |

**Success**

```json
{
  "success": true,
  "data": {
    "apl": 10.5,
    "stake": 100,
    "gameMode": "nap_perm",
    "gameId": "...",
    "betId": "...",
    "betNumber": 42,
    "tsn": "...",
    "terminalId": "...",
    "remainingCredit": 49900,
    "award": 0
  }
}
```

### Preview APL — `POST /api/pos/lotto/apl`

Same stake/mode/numbers/under fields as bet (no prize/credit deduction). Returns `{ apl, stake, gameMode }`.

---

## Pools

### Place bet — `POST /api/pos/pools/bet`

**Auth:** required

Same mode set as lotto. Use **matches** instead of numbers:

| Field | Aliases | Notes |
|-------|---------|-------|
| `matches` | `selectedMatches`, `numbers` | `string[]` of match numbers, or grouped object |
| `grouping` | | `{ selectedUs, groupSelections }` |
| `twobanker` | `two_banker` | `{ groupAU, groupAMatches, totalUnder }` |
| `onebanker` | `one_banker` | `{ groupAMatches }` |
| `prize` | `prize_id`, `prizeId` | Terminal prize |
| `gameMode`, `stake`, `under`, `gameId` | | Same as lotto |

```json
{
  "gameMode": "nap_perm",
  "stake": 200,
  "under": [3],
  "matches": ["1", "5", "12", "20"],
  "prize": "<prize-uuid>"
}
```

Credit is deducted from the terminal. Bet is stored in `bets_pools` with `terminal` set and `player: null`.

### Preview APL — `POST /api/pos/pools/apl`

Same shape as bet fields needed for APL; no credit change.

---

## Sports

### Place bet — `POST /api/pos/sports/bet`

**Auth:** required

| Field | Aliases | Required | Notes |
|-------|---------|----------|-------|
| `mode` | `gameMode`, `game_mode` | yes | `direct`, `permutation`, `grouping`, `one_banker` |
| `stake` | `staked`, `betAmount` | yes | |
| `under` | `matchAtLeast` | yes (rules below) | |
| `selections` | | yes* | Flat or grouped selection map |
| `grouping` | | grouping mode | `{ selectedUs, groupSelections }` |
| `onebanker` | `one_banker` | one_banker | `{ selections }` |
| `gameId` | `game_id` | no | Active sports game by default |

**Mode rules**

| Mode | `under` | Selections |
|------|---------|------------|
| `direct` | single value `[n]` | Flat `{ "12": ["H","D"], "15": ["A"] }` |
| `permutation` | non-empty array | Flat selections |
| `grouping` | single total-under `[n]` | Nested groups under `grouping.groupSelections` or `selections` |
| `one_banker` | must be `[2]` | Nested `{ "1-groupA": {...}, "2-groupB": {...} }` |

**Selection options:** `H`, `D`, `A`, `1X`, `12`, `X2`, `O25`, `U25`, `GG`

Matches are validated (not void / not processed / not past `end_time`).

Example (direct):

```json
{
  "mode": "direct",
  "stake": 500,
  "under": [2],
  "selections": {
    "3": ["H"],
    "8": ["D", "A"]
  }
}
```

**Success** includes `product: "sports"` plus standard bet fields (`apl`, `betId`, `betNumber`, `remainingCredit`, `award`, …).

### Preview APL — `POST /api/pos/sports/apl`

Requires `mode`, `stake`, `under`, `selections` (or grouping). No credit change.

---

## Football Pools (Sports Draw)

Product code: `sports_draw`  
URL prefix: `/api/pos/sports-draw`  
Alias for active game: `/api/pos/footballpools/active`

### Place bet — `POST /api/pos/sports-draw/bet`

Same request shape as **Sports**, with one extra rule:

> Every selected option must be `"D"` (draw only).

Invalid mix (e.g. `"H"`) → `400`  
`Sports draw selections must contain only draw (D) options`

Example:

```json
{
  "mode": "direct",
  "stake": 300,
  "under": [3],
  "selections": {
    "1": ["D"],
    "4": ["D"],
    "9": ["D"]
  }
}
```

Stored in `bets_sports_draw`. Success includes `product: "sports_draw"`.

### Preview APL — `POST /api/pos/sports-draw/apl`

Same as sports APL, with draw-only validation.

---

## Shared bet / credit behavior

For all place-bet endpoints:

1. Verify Bearer token and that terminal is still **active**.
2. Ensure terminal `game_modes` allows the product (if configured).
3. Enforce `max_stake` and available `credit_limit`.
4. Resolve active game (or validate provided `gameId` is in time window).
5. Insert bet with `terminal` + `player: null` + `status: "active"`.
6. Deduct stake from `terminal.credit_limit` (rollback bet insert if deduct fails).
7. If results/scores already exist, compute immediate `award` on the bet row.

Winnings settlement for POS/terminal tickets is separate from online `profiles.balance` credit.

---

## Endpoint index

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST/GET | `/api/pos/login` | No | Authenticate terminal |
| GET | `/api/pos/me` | Yes | Refresh terminal session |
| GET | `/api/pos/{product}/active` | Yes | Active game + fixtures |
| POST/GET | `/api/pos/lotto/bet` | Yes | Place lotto bet |
| POST/GET | `/api/pos/lotto/apl` | Yes | Lotto APL preview |
| POST/GET | `/api/pos/pools/bet` | Yes | Place pools bet |
| POST/GET | `/api/pos/pools/apl` | Yes | Pools APL preview |
| POST/GET | `/api/pos/sports/bet` | Yes | Place sports bet |
| POST/GET | `/api/pos/sports/apl` | Yes | Sports APL preview |
| POST/GET | `/api/pos/sports-draw/bet` | Yes | Place football pools bet |
| POST/GET | `/api/pos/sports-draw/apl` | Yes | Football pools APL preview |

---

## Client flow (recommended)

1. `POST /api/pos/login` → store `token`, `allowed_products`, `prizes`, `credit_limit`.
2. For chosen product, `GET /api/pos/{product}/active` → game id + fixtures.
3. Optionally `POST .../apl` to preview amount per line.
4. `POST .../bet` with `Authorization: Bearer <token>`.
5. Update UI credit from `data.remainingCredit`, or call `/api/pos/me`.

Optional env: `POS_TOKEN_SECRET` (falls back to `SUPABASE_SERVICE_ROLE_KEY` for HMAC signing).
