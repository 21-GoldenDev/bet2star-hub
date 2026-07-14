POS API guide


What this is for
----------------
POS terminals use these APIs to log in, see current games, preview APL (amount per line),
and place bets on Lotto, Pools, Sports, and Football Pools.

Base path: /api/pos


Auth in plain words
-------------------
1. Call Login with serial_number and password.
2. Save the token from the response.
3. Send this header on every other POS call:

   Authorization: Bearer YOUR_TOKEN_HERE

Token lifetime: about 24 hours.
If an admin disables the terminal, authenticated calls fail immediately.

Important for production:
  Set POS_TOKEN_SECRET in the server environment.
  This must be a dedicated secret.
  The server will not fall back to SUPABASE_SERVICE_ROLE_KEY.


Typical cashier flow
--------------------
1. POST /api/pos/login
2. GET /api/pos/{product}/active
3. Optional: POST .../apl to preview APL
4. POST .../bet to place the ticket
5. Show remainingCredit, or refresh with GET /api/pos/me


Endpoint list
-------------
Login (no token)
  POST /api/pos/login

Session refresh
  GET /api/pos/me

Active game + fixtures
  GET /api/pos/lotto/active
  GET /api/pos/pools/active
  GET /api/pos/sports/active
  GET /api/pos/sports-draw/active
  GET /api/pos/footballpools/active

Place bets (POST only)
  POST /api/pos/lotto/bet
  POST /api/pos/pools/bet
  POST /api/pos/sports/bet
  POST /api/pos/sports-draw/bet

Preview APL
  POST or GET /api/pos/lotto/apl
  POST or GET /api/pos/pools/apl
  POST or GET /api/pos/sports/apl
  POST or GET /api/pos/sports-draw/apl


Success response shape
----------------------
All successful POS calls return:

  {
    "success": true,
    "data": { ... }
  }


Standard error response shape
-----------------------------
All failed POS calls return:

  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "Human readable message",
      "details": { ... }
    }
  }

details is optional.


Error codes (common)
--------------------
INVALID_REQUEST       400  Missing or bad request fields
INVALID_CREDENTIALS   401  Wrong serial_number or password
TERMINAL_INACTIVE     401  Terminal disabled
AGENT_INACTIVE        401  Assigned agent disabled
TOKEN_REQUIRED        401  No Authorization Bearer token
TOKEN_INVALID         401  Token bad or expired
SERIAL_MISMATCH       403  Body serial does not match token terminal
PRODUCT_NOT_ALLOWED   403  Product not in terminal allowed_products
                           (missing or empty allowed_products means no products allowed)
INSUFFICIENT_CREDIT   400  Not enough terminal credit
MAX_STAKE_EXCEEDED    400  Stake above terminal max_stake
NO_ACTIVE_GAME        404  No open game for that product
GAME_NOT_ACTIVE       400  Provided gameId is outside its time window
GAME_NOT_FOUND        404  Unknown gameId
INVALID_MODE          400  Unknown gameMode / mode
INVALID_STAKE         400  Stake missing or <= 0
INVALID_SELECTIONS    400  Numbers / matches / selections invalid
MATCH_UNAVAILABLE     400  Match void, processed, expired, or missing
PRIZE_INACTIVE        400  Chosen prize is inactive on terminal
TERMINAL_NOT_FOUND    404  Terminal missing
CREDIT_DEDUCT_FAILED  500  Credit update failed (bet rolled back)
BET_SAVE_FAILED       500  Could not save bet
INTERNAL_ERROR        500  Unexpected server error

Example: insufficient credit

  {
    "success": false,
    "error": {
      "code": "INSUFFICIENT_CREDIT",
      "message": "Insufficient terminal credit",
      "details": {
        "credit_limit": 100,
        "stake": 500
      }
    }
  }

Example: max stake exceeded

  {
    "success": false,
    "error": {
      "code": "MAX_STAKE_EXCEEDED",
      "message": "Maximum stake is 2000000",
      "details": {
        "max_stake": 2000000,
        "stake": 2500000
      }
    }
  }

Example: no active game

  {
    "success": false,
    "error": {
      "code": "NO_ACTIVE_GAME",
      "message": "No active lotto game",
      "details": {
        "type": "lotto"
      }
    }
  }


1) Login
--------
POST /api/pos/login
Token: not needed

Request:

  {
    "serial_number": "346346346346aa",
    "password": "346346346"
  }

Accepted aliases: serialNumber, tsn, TSN, pin

Success data includes: token, terminal, agent, credit_limit, max_stake,
allowed_products, prizes (active + default), status.


2) Session / Me
---------------
GET /api/pos/me
Token: required

Returns current credit, products, prizes, agent (like login, without a new token).


3) Active game
--------------
GET /api/pos/{product}/active
Token: required

product: lotto | pools | sports | sports-draw | footballpools

If none is running:

  {
    "success": true,
    "data": {
      "game": null,
      "fixtures": []
    }
  }


4) Lotto place bet (POST only)
------------------------------
POST /api/pos/lotto/bet
Header: Authorization: Bearer TOKEN

Common fields for all lotto modes:
  gameMode   required
  stake      required
  prize      recommended (falls back to terminal default)
  gameId     optional
  under      mode-dependent (alias: matchAtLeast)

Successful bet data includes:
  apl, stake, gameMode, gameId, betId, betNumber, tsn, terminalId, remainingCredit, award


Lotto — Direct / NAP/PERM (gameMode: nap_perm)

  {
    "gameMode": "nap_perm",
    "stake": 5000,
    "under": [3, 4],
    "numbers": [5, 12, 18, 23, 41],
    "prize": "PRIZE-UUID"
  }


Lotto — Turbo (gameMode: turbo)

  {
    "gameMode": "turbo",
    "stake": 5000,
    "under": [3],
    "numbers": [2, 9, 15, 27, 33]
  }

Note: turbo typically does not need a prize field.


Lotto — Under 1 (gameMode: under1)

  {
    "gameMode": "under1",
    "stake": 5000,
    "numbers": [7, 14, 21],
    "prize": "PRIZE-UUID"
  }


Lotto — Under 2 (gameMode: under2)

  {
    "gameMode": "under2",
    "stake": 5000,
    "numbers": [3, 8, 19, 44],
    "prize": "PRIZE-UUID"
  }


Lotto — Grouping (gameMode: grouping)

  {
    "gameMode": "grouping",
    "stake": 5000,
    "under": [5],
    "prize": "PRIZE-UUID",
    "grouping": {
      "selectedUs": [
        { "id": "groupA", "u": 2 },
        { "id": "groupB", "u": 3 }
      ],
      "groupSelections": {
        "groupA": [1, 4, 9, 16],
        "groupB": [2, 5, 11, 20, 30]
      }
    }
  }


Lotto — 1 Banker / 1 Against (gameMode: one_banker)

  {
    "gameMode": "one_banker",
    "stake": 5000,
    "under": [2],
    "prize": "PRIZE-UUID",
    "onebanker": {
      "groupANumbers": [12, 25]
    }
  }

The server expands group B from the remaining visible numbers.


Lotto — 2 Banker (gameMode: two_banker)

  {
    "gameMode": "two_banker",
    "stake": 5000,
    "under": [5],
    "prize": "PRIZE-UUID",
    "twobanker": {
      "totalUnder": 5,
      "groupAU": 2,
      "groupANumbers": [8, 17]
    }
  }


5) Pools place bet (POST only)
------------------------------
POST /api/pos/pools/bet

Same modes as lotto. Use matches (match numbers as strings) instead of numbers.


Pools — Direct / NAP/PERM

  {
    "gameMode": "nap_perm",
    "stake": 2000,
    "under": [3],
    "matches": ["1", "5", "12", "20"],
    "prize": "PRIZE-UUID"
  }


Pools — Turbo

  {
    "gameMode": "turbo",
    "stake": 2000,
    "under": [3],
    "matches": ["2", "7", "11", "18"]
  }


Pools — Under 1

  {
    "gameMode": "under1",
    "stake": 2000,
    "matches": ["3", "9", "14"],
    "prize": "PRIZE-UUID"
  }


Pools — Under 2

  {
    "gameMode": "under2",
    "stake": 2000,
    "matches": ["1", "4", "8", "16"],
    "prize": "PRIZE-UUID"
  }


Pools — Grouping

  {
    "gameMode": "grouping",
    "stake": 2000,
    "under": [5],
    "prize": "PRIZE-UUID",
    "grouping": {
      "selectedUs": [
        { "id": "groupA", "u": 2 },
        { "id": "groupB", "u": 3 }
      ],
      "groupSelections": {
        "groupA": ["1", "4", "9"],
        "groupB": ["2", "5", "11", "20", "30"]
      }
    }
  }


Pools — 1 Banker

  {
    "gameMode": "one_banker",
    "stake": 2000,
    "under": [2],
    "prize": "PRIZE-UUID",
    "onebanker": {
      "groupAMatches": ["7", "19"]
    }
  }


Pools — 2 Banker

  {
    "gameMode": "two_banker",
    "stake": 2000,
    "under": [5],
    "prize": "PRIZE-UUID",
    "twobanker": {
      "totalUnder": 5,
      "groupAU": 2,
      "groupAMatches": ["6", "15"]
    }
  }


6) Sports place bet (POST only)
-------------------------------
POST /api/pos/sports/bet

Modes: direct, permutation, grouping, one_banker

Selection options: H, D, A, 1X, 12, X2, O25, U25, GG


Sports — Direct

  {
    "mode": "direct",
    "stake": 500,
    "under": [2],
    "selections": {
      "3": ["H"],
      "8": ["D", "A"]
    }
  }


Sports — Permutation

  {
    "mode": "permutation",
    "stake": 1000,
    "under": [2, 3],
    "selections": {
      "1": ["H"],
      "4": ["A"],
      "9": ["D"],
      "12": ["1X"]
    }
  }


Sports — Grouping

  {
    "mode": "grouping",
    "stake": 1500,
    "under": [4],
    "grouping": {
      "selectedUs": [
        { "id": "groupA", "u": 2 },
        { "id": "groupB", "u": 2 }
      ],
      "groupSelections": {
        "2-groupA": {
          "3": ["H"],
          "5": ["D"]
        },
        "2-groupB": {
          "8": ["A"],
          "10": ["12"]
        }
      }
    }
  }


Sports — 1 Banker

  {
    "mode": "one_banker",
    "stake": 1000,
    "under": [2],
    "onebanker": {
      "selections": {
        "1-groupA": {
          "4": ["H"]
        },
        "1-groupB": {
          "7": ["D"],
          "11": ["A"],
          "15": ["1X"]
        }
      }
    }
  }


7) Football Pools / Sports Draw (POST only)
-------------------------------------------
POST /api/pos/sports-draw/bet

Same shapes as Sports, but every option must be "D" only.


Football Pools — Direct

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


Football Pools — Permutation

  {
    "mode": "permutation",
    "stake": 500,
    "under": [2, 3],
    "selections": {
      "2": ["D"],
      "5": ["D"],
      "8": ["D"],
      "12": ["D"]
    }
  }


Football Pools — Grouping

  {
    "mode": "grouping",
    "stake": 800,
    "under": [4],
    "grouping": {
      "selectedUs": [
        { "id": "groupA", "u": 2 },
        { "id": "groupB", "u": 2 }
      ],
      "groupSelections": {
        "2-groupA": {
          "1": ["D"],
          "3": ["D"]
        },
        "2-groupB": {
          "6": ["D"],
          "9": ["D"]
        }
      }
    }
  }


Football Pools — 1 Banker

  {
    "mode": "one_banker",
    "stake": 600,
    "under": [2],
    "onebanker": {
      "selections": {
        "1-groupA": {
          "2": ["D"]
        },
        "1-groupB": {
          "5": ["D"],
          "8": ["D"],
          "14": ["D"]
        }
      }
    }
  }


What happens on every place-bet call
------------------------------------
1. Verify Bearer token and that the terminal is still active.
2. Check the terminal is allowed to play that product.
   If allowed_products / game_modes is missing or empty, no products are allowed.
3. Check max stake and available credit.
4. Resolve / validate the active game.
5. Save the bet against the terminal.
6. Deduct stake from terminal credit (rollback bet if deduct fails).
7. If results or scores already exist, set award immediately.
