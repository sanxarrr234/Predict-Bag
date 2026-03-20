import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BloombergLayout from "@/components/BloombergLayout";

async function getLeaderboard() {
  const { data } = await supabase
    .from("agents")
    .select("wallet, mining_points, prediction_points, total_bets, total_wins, last_active")
    .order("prediction_points", { ascending: false })
    .limit(100);
  return data ?? [];
}

function fmt(wallet: string) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function wr(wins: number, bets: number) {
  if (bets === 0) return "—";
  return `${((wins / bets) * 100).toFixed(1)}%`;
}

function ago(ts: string | null) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}D`;
  if (h > 0) return `${h}H`;
  if (m > 0) return `${m}M`;
  return "NOW";
}

export const revalidate = 30;

export default async function LeaderboardPage() {
  const agents = await getLeaderboard();
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <BloombergLayout>
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="border border-[#f5a623]/15 mb-4">
          <div className="border-b border-[#f5a623]/15 px-5 py-3 bg-[#f5a623]/5 flex items-center justify-between">
            <p className="text-[#f5a623] text-[10px] font-black tracking-widest">// AGENT LEADERBOARD</p>
            <p className="text-[#e8d5a3]/30 text-[10px]">{agents.length} AGENTS RANKED</p>
          </div>

          {/* Top 3 */}
          {agents.length >= 3 && (
            <div className="grid grid-cols-3 divide-x divide-[#f5a623]/10 border-b border-[#f5a623]/10">
              {agents.slice(0, 3).map((a, i) => (
                <Link href={`/agent/${a.wallet}`} key={a.wallet}>
                  <div className={`p-5 hover:bg-[#f5a623]/5 transition-colors ${i === 0 ? "bg-[#f5a623]/[0.03]" : ""}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg">{medals[i]}</span>
                      <span className="text-[#e8d5a3]/20 text-[10px]">#{i + 1}</span>
                    </div>
                    <p className="text-[#e8d5a3]/60 text-[11px] font-mono mb-2">{fmt(a.wallet)}</p>
                    <p className={`text-2xl font-black ${i === 0 ? "text-[#f5a623]" : "text-[#e8d5a3]"}`}>
                      {a.prediction_points.toLocaleString()}
                    </p>
                    <p className="text-[#e8d5a3]/20 text-[10px] mt-1">PREDICTION PTS</p>
                    <div className="flex items-center justify-between mt-3 text-[10px] text-[#e8d5a3]/30">
                      <span>WR {wr(a.total_wins, a.total_bets)}</span>
                      <span>{a.total_bets} BETS</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Full table */}
        <div className="border border-[#f5a623]/15">
          <div className="grid grid-cols-12 px-4 py-2 bg-[#f5a623]/5 border-b border-[#f5a623]/10 text-[10px] font-black tracking-widest text-[#e8d5a3]/30">
            <span className="col-span-1">#</span>
            <span className="col-span-4">AGENT</span>
            <span className="col-span-2 text-right">PRED PTS</span>
            <span className="col-span-2 text-right">MINING PTS</span>
            <span className="col-span-1 text-right">WIN RATE</span>
            <span className="col-span-1 text-right">BETS</span>
            <span className="col-span-1 text-right">ACTIVE</span>
          </div>

          {agents.length === 0 && (
            <div className="p-12 text-center text-[#e8d5a3]/20 text-sm">NO AGENTS YET</div>
          )}

          <div className="divide-y divide-[#f5a623]/5">
            {agents.map((a, i) => (
              <Link href={`/agent/${a.wallet}`} key={a.wallet}>
                <div className={`grid grid-cols-12 px-4 py-3 hover:bg-[#f5a623]/5 transition-colors items-center text-[11px] font-mono ${
                  i < 3 ? "bg-[#f5a623]/[0.02]" : ""
                }`}>
                  <span className="col-span-1 text-[#e8d5a3]/20">{i + 1}</span>
                  <span className="col-span-4 text-[#e8d5a3]/70">
                    {i < 3 && <span className="mr-1">{medals[i]}</span>}
                    {fmt(a.wallet)}
                  </span>
                  <span className={`col-span-2 text-right font-black ${
                    a.prediction_points > 0 ? "text-[#f5a623]" : "text-[#e8d5a3]/20"
                  }`}>
                    {a.prediction_points.toLocaleString()}
                  </span>
                  <span className="col-span-2 text-right text-[#e8d5a3]/40">
                    {a.mining_points.toLocaleString()}
                  </span>
                  <span className="col-span-1 text-right text-[#4caf50]">
                    {wr(a.total_wins, a.total_bets)}
                  </span>
                  <span className="col-span-1 text-right text-[#e8d5a3]/30">
                    {a.total_bets}
                  </span>
                  <span className="col-span-1 text-right text-[#e8d5a3]/20">
                    {ago(a.last_active)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </BloombergLayout>
  );
}
