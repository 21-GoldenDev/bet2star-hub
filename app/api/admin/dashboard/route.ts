import { createSupabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
      ? createClient(supabaseUrl, supabaseServiceKey)
      : null;

    // Get game type filter from query params
    const searchParams = request.nextUrl.searchParams;
    const gameTypeFilter = searchParams.get("gameType") || "all"; // all, lotto, pools, sports

    // Fetch all profiles to get user counts
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("role, created_at");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Count users by role
    const onlinePlayers = profiles?.length || 0;
    const offlinePlayers = 0;
    const staffMembers = profiles?.filter(p => p.role === "admin" || p.role === "staff").length || 0;
    const totalUsers = onlinePlayers + offlinePlayers;

    // Get active games per type (current time between start_time and end_time)
    const now = new Date().toISOString();
    let activeGamesQuery = supabase
      .from("games")
      .select("id, type")
      .lte("start_time", now)
      .gte("end_time", now);

    // Filter by game type if specified
    if (gameTypeFilter !== "all") {
      activeGamesQuery = activeGamesQuery.eq("type", gameTypeFilter);
    }

    const { data: activeGamesData, error: activeGamesError } = await activeGamesQuery;

    if (activeGamesError && activeGamesError.code !== "PGRST116") {
      console.error("Error fetching active games:", activeGamesError);
    }

    const activeLottoId = activeGamesData?.find((g: any) => g.type === "lotto")?.id;
    const activePoolsId = activeGamesData?.find((g: any) => g.type === "pools")?.id;
    const activeSportsId = activeGamesData?.find((g: any) => g.type === "sports")?.id;
    const activeSportsDrawId = activeGamesData?.find((g: any) => g.type === "sports_draw")?.id;
    const activeGamesCount = [activeLottoId, activePoolsId, activeSportsId, activeSportsDrawId].filter(Boolean).length;

    // Fetch bets only for the current active games, respecting game type filter
    let lottoQuery = supabase
      .from("bets_lotto")
      .select("staked, bet_time, award, status");

    let poolsQuery = supabase
      .from("bets_pools")
      .select("staked, bet_time, award, status");

    let sportsQuery = supabase
      .from("bets_sport")
      .select("staked, bet_time, award, status");

    let sportsDrawQuery = supabase
      .from("bets_sports_draw")
      .select("staked, bet_time, award, status");

    // Apply filters based on gameTypeFilter
    if (gameTypeFilter === "all") {
      lottoQuery = activeLottoId ? lottoQuery.eq("game_id", activeLottoId) : lottoQuery.limit(0);
      poolsQuery = activePoolsId ? poolsQuery.eq("game_id", activePoolsId) : poolsQuery.limit(0);
      sportsQuery = activeSportsId ? sportsQuery.eq("game_id", activeSportsId) : sportsQuery.limit(0);
      sportsDrawQuery = activeSportsDrawId ? sportsDrawQuery.eq("game_id", activeSportsDrawId) : sportsDrawQuery.limit(0);
    } else if (gameTypeFilter === "lotto") {
      lottoQuery = activeLottoId ? lottoQuery.eq("game_id", activeLottoId) : lottoQuery.limit(0);
      poolsQuery = poolsQuery.limit(0);
      sportsQuery = sportsQuery.limit(0);
      sportsDrawQuery = sportsDrawQuery.limit(0);
    } else if (gameTypeFilter === "pools") {
      lottoQuery = lottoQuery.limit(0);
      poolsQuery = activePoolsId ? poolsQuery.eq("game_id", activePoolsId) : poolsQuery.limit(0);
      sportsQuery = sportsQuery.limit(0);
      sportsDrawQuery = sportsDrawQuery.limit(0);
    } else if (gameTypeFilter === "sports") {
      lottoQuery = lottoQuery.limit(0);
      poolsQuery = poolsQuery.limit(0);
      sportsQuery = activeSportsId ? sportsQuery.eq("game_id", activeSportsId) : sportsQuery.limit(0);
      sportsDrawQuery = sportsDrawQuery.limit(0);
    } else if (gameTypeFilter === "sports_draw") {
      lottoQuery = lottoQuery.limit(0);
      poolsQuery = poolsQuery.limit(0);
      sportsQuery = sportsQuery.limit(0);
      sportsDrawQuery = activeSportsDrawId ? sportsDrawQuery.eq("game_id", activeSportsDrawId) : sportsDrawQuery.limit(0);
    }

    const [
      { data: lottoBets, error: lottoError },
      { data: poolsBets, error: poolsError },
      { data: sportsBets, error: sportsError },
      { data: sportsDrawBets, error: sportsDrawError }
    ] = await Promise.all([
      lottoQuery,
      poolsQuery,
      sportsQuery,
      sportsDrawQuery
    ]);

    if (lottoError || poolsError || sportsError || sportsDrawError) {
      console.error("Error fetching bets:", { lottoError, poolsError, sportsError, sportsDrawError });
    }

    // Calculate financial metrics for current active game only
    const allBets = [
      ...(lottoBets || []),
      ...(poolsBets || []),
      ...(sportsBets || []),
      ...(sportsDrawBets || [])
    ];

    const totalBetsCount = allBets.length;
    const totalSalesAmount = allBets.reduce((sum, bet) => sum + (bet.staked || 0), 0);

    // Sum of awards (commission paid to agents)
    const totalCommission = 0;

    const totalWinningsAmount = allBets.reduce((sum, bet) => sum + (bet.award || 0), 0);

    const balanceProfitOrLoss = totalSalesAmount - totalWinningsAmount - totalCommission;

    // Get recent signups (last 10) with emails from auth.users
    let recentUsers: Array<{ user_id: string; full_name: string | null; email: string | null; role: string | null; created_at: string }> = [];
    try {
      if (!supabaseAdmin) {
        console.error("Supabase admin client is not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
      } else {
        const { data: usersData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });

        if (authError) {
          console.error("Error fetching auth users:", authError);
        } else {
          const authUsers = (usersData?.users || [])
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10);

          if (authUsers.length === 0) {
            recentUsers = [];
          }

          const userIds = authUsers.map((u: any) => u.id);
          const { data: profileRows, error: profileRowsError } = await (supabaseAdmin
            .from("profiles")
            .select("user_id, full_name, role, phone")
            .in("user_id", userIds));

          if (profileRowsError) {
            console.error("Error fetching profiles for recent users:", profileRowsError);
          }

          const profileById = new Map<string, { full_name: string | null; role: string | null; phone: string | null }>();
          (profileRows || []).forEach((p: any) => {
            profileById.set(p.user_id, { full_name: p.full_name ?? null, role: p.role ?? null, phone: p.phone ?? null });
          });

          recentUsers = authUsers.map((u: any) => ({
            user_id: u.id,
            full_name: profileById.get(u.id)?.full_name ?? null,
            email: u.email ?? null,
            role: profileById.get(u.id)?.role ?? null,
            phone: profileById.get(u.id)?.phone ?? u.phone ?? null,
            created_at: u.created_at,
          }));
        }
      }
    } catch (e) {
      console.error("Failed building recent users list:", e);
    }

    // Chart data: Group bets by week
    const chartData = generateChartData(allBets, profiles);

    // Void bets statistics - count bets with status='void' from already fetched data
    const voidLottoCount = lottoBets?.filter(bet => bet.status === "void").length || 0;
    const voidPoolsCount = poolsBets?.filter(bet => bet.status === "void").length || 0;
    const voidSportsCount = sportsBets?.filter(bet => bet.status === "void").length || 0;
    const voidSportsDrawCount = sportsDrawBets?.filter(bet => bet.status === "void").length || 0;

    const approvedRequests = voidLottoCount + voidPoolsCount + voidSportsCount + voidSportsDrawCount;
    const totalRequests = approvedRequests;
    const dismissedRequests = 0;

    return NextResponse.json({
      stats: {
        totalUsers,
        onlinePlayers,
        offlinePlayers,
        staffMembers,
        activeGames: activeGamesCount,
        totalBetsCount,
        totalSalesAmount: Math.round(totalSalesAmount),
        totalCommission: Math.round(totalCommission),
        totalWinningsAmount: Math.round(totalWinningsAmount),
        balanceProfitOrLoss: Math.round(balanceProfitOrLoss),
      },
      voidStats: {
        totalRequests,
        approvedRequests,
        dismissedRequests,
      },
      chartData,
      recentUsers: recentUsers || [],
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

function generateChartData(bets: any[], profiles: any[]) {
  // Group by week for the last 6 weeks
  const now = new Date();
  const weeks = [];

  for (let i = 5; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i * 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekBets = bets.filter(bet => {
      const betDate = new Date(bet.bet_time);
      return betDate >= weekStart && betDate <= weekEnd;
    });

    const weekUsers = profiles.filter(profile => {
      const createdDate = new Date(profile.created_at);
      return createdDate >= weekStart && createdDate <= weekEnd;
    });

    const revenue = weekBets.reduce((sum, bet) => sum + (bet.staked || 0) - (bet.award || 0), 0);

    weeks.push({
      date: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      users: weekUsers.length,
      revenue: Math.round(revenue),
      bets: weekBets.length,
    });
  }

  return weeks;
}
