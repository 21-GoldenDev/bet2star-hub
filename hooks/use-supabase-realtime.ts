"use client";

import { useEffect, useRef } from "react";
import supabase from "@/lib/supabase/client";

export type RealtimeSubscription = {
  table: string;
  schema?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
};

type UseSupabaseRealtimeOptions = {
  channelName: string;
  subscriptions: RealtimeSubscription[];
  onEvent: () => void;
  enabled?: boolean;
  debounceMs?: number;
};

function subscriptionsKey(subscriptions: RealtimeSubscription[]) {
  return subscriptions
    .map((sub) => `${sub.schema ?? "public"}:${sub.table}:${sub.event ?? "*"}:${sub.filter ?? ""}`)
    .join("|");
}

export function useSupabaseRealtime({
  channelName,
  subscriptions,
  onEvent,
  enabled = true,
  debounceMs = 300,
}: UseSupabaseRealtimeOptions) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const subscriptionsKeyValue = subscriptionsKey(subscriptions);

  useEffect(() => {
    if (!enabled || subscriptions.length === 0) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleEvent = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => onEventRef.current(), debounceMs);
    };

    type PostgresChangeConfig = {
      event: "INSERT" | "UPDATE" | "DELETE" | "*";
      schema: string;
      table: string;
      filter?: string;
    };

    const buildChangeConfig = (sub: RealtimeSubscription): PostgresChangeConfig => ({
      event: sub.event ?? "*",
      schema: sub.schema ?? "public",
      table: sub.table,
      ...(sub.filter ? { filter: sub.filter } : {}),
    });

    const addPostgresListener = (
      realtimeChannel: ReturnType<typeof supabase.channel>,
      config: PostgresChangeConfig,
    ) =>
      realtimeChannel.on(
        "postgres_changes",
        config as never,
        scheduleEvent,
      );

    let channel = addPostgresListener(
      supabase.channel(channelName),
      buildChangeConfig(subscriptions[0]),
    );

    for (let index = 1; index < subscriptions.length; index += 1) {
      channel = addPostgresListener(channel, buildChangeConfig(subscriptions[index]));
    }

    channel.subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [channelName, debounceMs, enabled, subscriptionsKeyValue]);
}
