/**
 * One-off repair: remove Group A bankers from Group B on existing
 * one_banker / two_banker pools + lotto bets.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/repair-banker-group-overlap.ts
 *   npx tsx --env-file=.env scripts/repair-banker-group-overlap.ts --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import {
  repairOverlappingLottoBankerNumbers,
  repairOverlappingPoolsBankerMatches,
} from "../lib/bets/groupSelections";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);
const BANKER_MODES = ["one_banker", "two_banker"];
const PAGE_SIZE = 500;

async function fetchAll<T extends { id: string }>(
  table: "bets_pools" | "bets_lotto",
  select: string,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .in("gameType", BANKER_MODES)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function repairPools() {
  const bets = await fetchAll<{
    id: string;
    bet_id: number;
    gameType: string;
    matches: unknown;
  }>("bets_pools", "id, bet_id, gameType, matches");

  let scanned = 0;
  let changed = 0;
  let failed = 0;

  for (const bet of bets) {
    scanned += 1;
    const result = repairOverlappingPoolsBankerMatches(bet.matches);
    if (!result?.changed) continue;

    changed += 1;
    console.log(
      `[pools] ${dryRun ? "would fix" : "fixing"} id=${bet.id} bet_id=${bet.bet_id} mode=${bet.gameType}`,
    );

    if (dryRun) continue;

    const { error } = await supabase
      .from("bets_pools")
      .update({ matches: result.next })
      .eq("id", bet.id);

    if (error) {
      failed += 1;
      console.error(`[pools] failed id=${bet.id}: ${error.message}`);
    }
  }

  return { scanned, changed, failed };
}

async function repairLotto() {
  const bets = await fetchAll<{
    id: string;
    bet_id: number;
    gameType: string;
    numbers: unknown;
  }>("bets_lotto", "id, bet_id, gameType, numbers");

  let scanned = 0;
  let changed = 0;
  let failed = 0;

  for (const bet of bets) {
    scanned += 1;
    const result = repairOverlappingLottoBankerNumbers(bet.numbers);
    if (!result?.changed) continue;

    changed += 1;
    console.log(
      `[lotto] ${dryRun ? "would fix" : "fixing"} id=${bet.id} bet_id=${bet.bet_id} mode=${bet.gameType}`,
    );

    if (dryRun) continue;

    const { error } = await supabase
      .from("bets_lotto")
      .update({ numbers: result.next })
      .eq("id", bet.id);

    if (error) {
      failed += 1;
      console.error(`[lotto] failed id=${bet.id}: ${error.message}`);
    }
  }

  return { scanned, changed, failed };
}

async function main() {
  console.log(dryRun ? "Dry run — no writes." : "Applying repairs…");

  const pools = await repairPools();
  const lotto = await repairLotto();

  console.log("\nSummary");
  console.log(
    `  pools: scanned=${pools.scanned} changed=${pools.changed} failed=${pools.failed}`,
  );
  console.log(
    `  lotto: scanned=${lotto.scanned} changed=${lotto.changed} failed=${lotto.failed}`,
  );

  if (pools.failed || lotto.failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
