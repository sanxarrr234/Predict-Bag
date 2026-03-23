"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 50;

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [tab, setTab] = useState<"payouts" | "pools" | "agents">("payouts");

  const [payouts, setPayouts] = useState<Record<string, unknown>[]>([]);
  const [pools, setPools] = useState<Record<string, unknown>[]>([]);
  const [agents, setAgents] = useState<Record<string, unknown>[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [agentPage, setAgentPage] = useState(0);
  const [agentTotal, setAgentTotal] = useState(0);
  const [agentLoading, setAgentLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const res = await fetch("/api/admin/verify");
    if (res.ok) setAuthenticated(true);
  }

  async function login() {
    if (!secret) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (res.ok) {
        setAuthenticated(true);
        setSecret("");
      } else {
        setAuthError("Invalid secret key");
      }
    } catch {
      setAuthError("Connection error");
    }
    setAuthLoading(false);
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
  }

  async function loadPayouts() {
    const { data } = await supabase
      .from("payout_requests")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(100);
    setPayouts(data ?? []);
  }

  async function loadPools() {
    const { data } = await supabase
      .from("pools")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setPools(data ?? []);
  }

  const loadAgents = useCallback(async (search: string, page: number) => {
    setAgentLoading(true);
    let query = supabase
      .from("agents")
      .select("*", { count: "exact" })
      .order("prediction_points", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.length > 3) {
      query = query.ilike("wallet", `%${search}%`);
    }

    const { data, count } = await query;
    setAgents(data ?? []);
    setAgentTotal(count ?? 0);
    setAgentLoading(false);
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadPayouts(), loadPools(), loadAgents(agentSearch, agentPage)]);
    setLoading(false);
  }

  async function markPayoutSent(id: string, txHash: string) {
    if (!txHash) return;
    await supabase
      .from("payout_requests")
      .update({ status: "sent", tx_hash: txHash, processed_at: new Date().toISOString() })
      .eq("id", id);
    loadPayouts();
  }

  async function markPayoutRejected(id: string) {
    const payout = payouts.find((p) => p.id === id);
    if (payout) {
      const { data: agent } = await supabase
        .from("agents")
        .select("prediction_points")
        .eq("wallet", payout.wallet as string)
        .single();
      if (agent) {
        await supabase
          .from("agents")
          .update({
            prediction_points:
              (agent.prediction_points as number) + (payout.prediction_points_spent as number),
          })
          .eq("wallet", payout.wallet as string);
      }
    }
    await supabase
      .from("payout_requests")
      .update({
        status: "rejected",
        rejection_reason: "Rejected by admin",
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);
    loadPayouts();
  }

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) loadAgents(agentSearch, agentPage);
  }, [agentSearch, agentPage, authenticated, loadAgents]);

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="border border-[#f5a623]/20 p-8 w-full max-w-sm" style={{ fontFamily: "'IBM Plex Mono','Courier New',monospace" }}>
          <p className="text-[#f5a623] text-[10px] font-black tracking-widest mb-6">// ADMIN ACCESS</p>
          <input
            type="password"
            placeholder="Enter secret key..."
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="w-full bg-[#111] border border-[#f5a623]/20 px-4 py-3 font-mono text-sm mb-3 text-[#e8d5a3] placeholder:text-[#e8d5a3]/20 focus:outline-none focus:border-[#f5a623]/50"
          />
          {authError && (
            <p className="text-[#f44336] text-[11px] font-mono mb-3">{authError}</p>
          )}
          <button
            onClick={login}
            disabled={authLoading || !secret}
            className="w-full py-3 bg-[#f5a623] text-[#0a0a0a] font-black text-sm disabled:opacity-30"
          >
            {authLoading ? "VERIFYING..." : "ENTER"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ fontFamily: "'IBM Plex Mono','Courier New',monospace" }}>
      <nav className="border-b border-[#f5a623]/15 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-mono text-sm text-[#f5a623] tracking-widest">PREDICTBAG</Link>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-[#e8d5a3]/30">ADMIN PANEL</span>
          <button onClick={logout} className="text-xs font-mono text-[#e8d5a3]/30 hover:text-[#f44336] transition-colors">
            LOGOUT
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-8 border-b border-[#f5a623]/15 pb-4">
          {(["payouts", "pools", "agents"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-xs font-mono transition-colors ${
                tab === t
                  ? "text-[#f5a623] border border-[#f5a623]"
                  : "text-[#e8d5a3]/30 border border-transparent hover:text-[#e8d5a3]"
              }`}
            >
              {t.toUpperCase()}
              {t === "payouts" && payouts.filter((p) => p.status === "pending").length > 0 && (
                <span className="ml-1.5 bg-[#f5a623] text-[#0a0a0a] px-1.5 py-0.5 text-[10px] font-black rounded-sm">
                  {payouts.filter((p) => p.status === "pending").length}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={loadData}
            className="ml-auto px-4 py-2 text-xs font-mono text-[#e8d5a3]/30 border border-[#f5a623]/15 hover:border-[#f5a623] hover:text-[#f5a623] transition-colors"
          >
            {loading ? "..." : "↻ REFRESH"}
          </button>
        </div>

        {tab === "payouts" && (
          <div>
            <h2 className="font-bold mb-4 text-[#e8d5a3] font-mono text-sm">
              PAYOUT REQUESTS
              <span className="ml-2 text-xs font-mono text-[#e8d5a3]/30">
                ({payouts.filter((p) => p.status === "pending").length} pending · {payouts.length} total)
              </span>
            </h2>
            <div className="space-y-3">
              {payouts.length === 0 && (
                <div className="border border-[#f5a623]/10 p-8 text-center text-[#e8d5a3]/30 font-mono text-sm">
                  NO PAYOUT REQUESTS
                </div>
              )}
              {payouts.map((payout) => (
                <PayoutRow
                  key={payout.id as string}
                  payout={payout}
                  onSent={markPayoutSent}
                  onRejected={markPayoutRejected}
                />
              ))}
            </div>
          </div>
        )}

        {tab === "pools" && (
          <div>
            <h2 className="font-bold mb-4 text-[#e8d5a3] font-mono text-sm">POOLS <span className="text-xs font-mono text-[#e8d5a3]/30">({pools.length} shown)</span></h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#f5a623]/15 text-[#e8d5a3]/30">
                    <th className="text-left py-3 pr-4">TOKEN</th>
                    <th className="text-left py-3 pr-4">DIR</th>
                    <th className="text-left py-3 pr-4">TIMEFRAME</th>
                    <th className="text-left py-3 pr-4">STATUS</th>
                    <th className="text-left py-3 pr-4">POT</th>
                    <th className="text-left py-3 pr-4">OUTCOME</th>
                    <th className="text-left py-3">CLOSES</th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((pool) => (
                    <tr key={pool.id as string} className="border-b border-[#f5a623]/10 hover:bg-[#f5a623]/5">
                      <td className="py-3 pr-4 text-[#e8d5a3] font-bold">{pool.token_symbol as string}</td>
                      <td className="py-3 pr-4">
                        <span className={pool.direction === "up" ? "text-[#4caf50]" : "text-[#f44336]"}>
                          {pool.direction === "up" ? "↑" : "↓"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-[#e8d5a3]/40">{(pool.timeframe as string).toUpperCase()}</td>
                      <td className="py-3 pr-4">
                        <span className={pool.status === "open" ? "text-[#4caf50]" : pool.status === "resolved" ? "text-[#e8d5a3]/30" : "text-[#f5a623]"}>
                          {(pool.status as string).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-[#e8d5a3]">{(pool.total_pot as number).toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        {pool.outcome
                          ? <span className={pool.outcome === "yes" ? "text-[#4caf50]" : "text-[#f44336]"}>{(pool.outcome as string).toUpperCase()}</span>
                          : <span className="text-[#e8d5a3]/30">—</span>}
                      </td>
                      <td className="py-3 text-[#e8d5a3]/30">{new Date(pool.closes_at as string).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "agents" && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-4">
              <h2 className="font-bold text-[#e8d5a3] font-mono text-sm">
                AGENTS <span className="text-xs font-mono text-[#e8d5a3]/30">({agentTotal.toLocaleString()} total)</span>
              </h2>
              <input
                type="text"
                placeholder="Search by wallet address..."
                value={agentSearch}
                onChange={(e) => { setAgentSearch(e.target.value); setAgentPage(0); }}
                className="bg-[#111] border border-[#f5a623]/20 px-4 py-2 font-mono text-xs text-[#e8d5a3] w-72 focus:outline-none focus:border-[#f5a623]/50 placeholder:text-[#e8d5a3]/20"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#f5a623]/15 text-[#e8d5a3]/30">
                    <th className="text-left py-3 pr-4">WALLET</th>
                    <th className="text-left py-3 pr-4">MINING PTS</th>
                    <th className="text-left py-3 pr-4">PRED PTS</th>
                    <th className="text-left py-3 pr-4">BETS</th>
                    <th className="text-left py-3 pr-4">WINS</th>
                    <th className="text-left py-3">LAST ACTIVE</th>
                  </tr>
                </thead>
                <tbody>
                  {agentLoading ? (
                    <tr><td colSpan={6} className="py-8 text-center text-[#e8d5a3]/30">LOADING...</td></tr>
                  ) : agents.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-[#e8d5a3]/30">NO AGENTS FOUND</td></tr>
                  ) : agents.map((agent) => {
                    const winRate = (agent.total_bets as number) > 0
                      ? (((agent.total_wins as number) / (agent.total_bets as number)) * 100).toFixed(0)
                      : "0";
                    return (
                      <tr key={agent.id as string} className="border-b border-[#f5a623]/10 hover:bg-[#f5a623]/5">
                        <td className="py-3 pr-4 text-[#e8d5a3]">{(agent.wallet as string).slice(0, 8)}...{(agent.wallet as string).slice(-6)}</td>
                        <td className="py-3 pr-4 text-[#f5a623]">{(agent.mining_points as number).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-[#e8d5a3]">{(agent.prediction_points as number).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-[#e8d5a3]/40">{agent.total_bets as number}</td>
                        <td className="py-3 pr-4">
                          <span className="text-[#e8d5a3]">{agent.total_wins as number}</span>
                          <span className="text-[#e8d5a3]/30 ml-1">({winRate}%)</span>
                        </td>
                        <td className="py-3 text-[#e8d5a3]/30">
                          {agent.last_active ? new Date(agent.last_active as string).toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {agentTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#f5a623]/15">
                <span className="text-xs font-mono text-[#e8d5a3]/30">
                  Showing {agentPage * PAGE_SIZE + 1}–{Math.min((agentPage + 1) * PAGE_SIZE, agentTotal)} of {agentTotal.toLocaleString()}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setAgentPage((p) => Math.max(0, p - 1))} disabled={agentPage === 0}
                    className="px-4 py-2 text-xs font-mono border border-[#f5a623]/15 text-[#e8d5a3]/30 hover:border-[#f5a623] hover:text-[#f5a623] disabled:opacity-30 transition-colors">
                    ← PREV
                  </button>
                  <span className="px-4 py-2 text-xs font-mono text-[#e8d5a3]/30 border border-[#f5a623]/15">
                    {agentPage + 1} / {Math.ceil(agentTotal / PAGE_SIZE)}
                  </span>
                  <button onClick={() => setAgentPage((p) => p + 1)} disabled={(agentPage + 1) * PAGE_SIZE >= agentTotal}
                    className="px-4 py-2 text-xs font-mono border border-[#f5a623]/15 text-[#e8d5a3]/30 hover:border-[#f5a623] hover:text-[#f5a623] disabled:opacity-30 transition-colors">
                    NEXT →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function PayoutRow({ payout, onSent, onRejected }: {
  payout: Record<string, unknown>;
  onSent: (id: string, txHash: string) => void;
  onRejected: (id: string) => void;
}) {
  const [txHash, setTxHash] = useState("");
  const isPending = payout.status === "pending";
  const txHashStr = payout.tx_hash as string | null;
  const usdcAmount = ((payout.prediction_points_spent as number) / 1000).toFixed(2);

  return (
    <div className={`border p-4 ${isPending ? "border-[#f5a623]/30 bg-[#f5a623]/[0.02]" : "border-[#f5a623]/10"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="font-mono text-sm text-[#e8d5a3]">
            {(payout.wallet as string).slice(0, 8)}...{(payout.wallet as string).slice(-6)}
          </div>
          <div className="font-mono text-xs text-[#e8d5a3]/40">
            {(payout.prediction_points_spent as number).toLocaleString()} pts →{" "}
            <span className="text-[#4caf50] font-black">${usdcAmount} USDC</span>
          </div>
          <div className="font-mono text-xs text-[#e8d5a3]/30">
            Wallet: {payout.wallet_age_days as number} days · {payout.wallet_tx_count as number} txs
          </div>
          <div className="font-mono text-xs text-[#e8d5a3]/30">
            {payout.requested_at ? new Date(payout.requested_at as string).toLocaleString() : "—"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPending ? (
            <>
              <input type="text" placeholder="tx hash..." value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="bg-[#111] border border-[#f5a623]/20 px-3 py-2 font-mono text-xs text-[#e8d5a3] w-48 focus:outline-none focus:border-[#f5a623]/50" />
              <button onClick={() => onSent(payout.id as string, txHash)} disabled={!txHash}
                className="px-4 py-2 bg-[#4caf50] text-[#0a0a0a] text-xs font-black disabled:opacity-30 hover:bg-[#4caf50]/80 transition-colors">
                SENT
              </button>
              <button onClick={() => onRejected(payout.id as string)}
                className="px-4 py-2 border border-[#f44336] text-[#f44336] text-xs font-black hover:bg-[#f44336]/10 transition-colors">
                REJECT
              </button>
            </>
          ) : (
            <span className={`text-xs font-mono ${payout.status === "sent" ? "text-[#4caf50]" : "text-[#f44336]"}`}>
              {(payout.status as string).toUpperCase()}
              {txHashStr && (
                <a href={`https://basescan.org/tx/${txHashStr}`} target="_blank" rel="noopener noreferrer" className="ml-2 underline">
                  VIEW TX
                </a>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
