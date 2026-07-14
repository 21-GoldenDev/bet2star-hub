import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameType } from "@/lib/types/gameMode";
import {
  getDefaultTerminalPrizeId,
  isTerminalPrizeActive,
  normalizeTerminalPrizeEntries,
} from "@/lib/terminals/terminalPrize";
import { createPosToken } from "@/lib/pos/posToken";
import { PosError, POS_ERROR_CODES } from "@/lib/pos/posErrors";

export type PosPrizeInfo = {
  prize_id: string;
  name: string;
  commission: number;
  default: boolean;
  status: "active" | "inactive";
};

export type PosAgentInfo = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  status: "active" | "inactive";
};

export type PosTerminalInfo = {
  id: string;
  serial_number: string;
};

export type PosLoginResult = {
  token: string;
  terminal: PosTerminalInfo;
  agent: PosAgentInfo;
  credit_limit: number;
  max_stake: number;
  allowed_products: GameType[];
  prizes: {
    active: PosPrizeInfo[];
    default: PosPrizeInfo | null;
  };
  status: "active" | "inactive";
};

export async function authenticatePosLogin(
  supabase: SupabaseClient,
  serialNumber: string,
  password: string,
): Promise<PosLoginResult> {
  const normalizedSerial = serialNumber.trim();
  if (!normalizedSerial || !password) {
    throw new PosError(
      POS_ERROR_CODES.INVALID_REQUEST,
      "Serial number and password are required.",
    );
  }

  const { data: terminal, error: terminalError } = await supabase
    .from("terminal")
    .select(
      "id, serial_number, password, status, credit_limit, max_stake, game_modes, prizes, agent_id",
    )
    .eq("serial_number", normalizedSerial)
    .maybeSingle();

  if (terminalError) {
    throw new PosError(POS_ERROR_CODES.INTERNAL_ERROR, terminalError.message);
  }

  if (!terminal) {
    throw new PosError(
      POS_ERROR_CODES.INVALID_CREDENTIALS,
      "Invalid serial number or password.",
    );
  }

  const storedPassword = String(terminal.password || "");
  if (storedPassword !== password) {
    throw new PosError(
      POS_ERROR_CODES.INVALID_CREDENTIALS,
      "Invalid serial number or password.",
    );
  }

  if (terminal.status !== "active") {
    throw new PosError(POS_ERROR_CODES.TERMINAL_INACTIVE, "Terminal is inactive.");
  }

  const { data: agent, error: agentError } = await supabase
    .from("agent")
    .select("id, username, first_name, last_name, status")
    .eq("id", terminal.agent_id)
    .maybeSingle();

  if (agentError) {
    throw new PosError(POS_ERROR_CODES.INTERNAL_ERROR, agentError.message);
  }

  if (!agent) {
    throw new PosError(POS_ERROR_CODES.AGENT_INACTIVE, "Assigned agent not found.");
  }

  if (agent.status !== "active") {
    throw new PosError(POS_ERROR_CODES.AGENT_INACTIVE, "Assigned agent is inactive.");
  }

  const prizeEntries = normalizeTerminalPrizeEntries(terminal.prizes);
  const activePrizeIds = prizeEntries
    .filter(isTerminalPrizeActive)
    .map((entry) => entry.prize_id);

  const prizeNameById = new Map<string, string>();
  if (activePrizeIds.length > 0) {
    const { data: prizeRows, error: prizeError } = await supabase
      .from("prize")
      .select("id, name")
      .in("id", activePrizeIds);

    if (prizeError) {
      throw new PosError(POS_ERROR_CODES.INTERNAL_ERROR, prizeError.message);
    }

    for (const row of prizeRows || []) {
      prizeNameById.set(String(row.id), String(row.name || row.id));
    }
  }

  const prizes: PosPrizeInfo[] = prizeEntries.map((entry) => ({
    prize_id: entry.prize_id,
    name: prizeNameById.get(entry.prize_id) || entry.prize_id,
    commission: entry.commission,
    default: entry.default,
    status: entry.status,
  }));

  const activePrizes = prizes.filter((prize) => prize.status === "active");
  const defaultPrizeId = getDefaultTerminalPrizeId(terminal.prizes);
  const defaultPrize =
    activePrizes.find((prize) => prize.prize_id === defaultPrizeId) ||
    activePrizes.find((prize) => prize.default) ||
    null;

  const allowedProducts = Array.isArray(terminal.game_modes)
    ? (terminal.game_modes as GameType[])
    : [];

  return {
    token: createPosToken(terminal.id, terminal.serial_number),
    terminal: {
      id: terminal.id,
      serial_number: terminal.serial_number,
    },
    agent: {
      id: agent.id,
      username: agent.username,
      first_name: agent.first_name,
      last_name: agent.last_name,
      status: agent.status,
    },
    credit_limit: Number(terminal.credit_limit || 0),
    max_stake: Number(terminal.max_stake || 0),
    allowed_products: allowedProducts,
    prizes: {
      active: activePrizes,
      default: defaultPrize,
    },
    status: terminal.status,
  };
}
