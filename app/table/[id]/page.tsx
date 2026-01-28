"use client";

import useSWR from "swr";
import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Denoms = {
  white: number;
  blue: number;
  red: number;
  green: number;
  black: number;
};

export default function TablePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const { data, mutate, error } = useSWR(id ? `/api/table/${id}` : null, fetcher, {
    refreshInterval: 2500,
    onError: (err) => {
      console.error("Error fetching table:", err);
    },
    onSuccess: (data) => {
      // If table has been deleted (null response), redirect to home
      if (data === null) {
        alert("This game has ended and been archived.");
        window.location.href = "/";
      }
    }
  });

  const [playerName, setPlayerName] = useState("");
  const [rebuyAmt, setRebuyAmt] = useState("");
  const [rebuyPlayer, setRebuyPlayer] = useState("");
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [showEditName, setShowEditName] = useState(false);
  const [editNameLoading, setEditNameLoading] = useState(false);

  // Store chip counts for each player
  const [playerChips, setPlayerChips] = useState<Record<string, { white: number; blue: number; red: number; green: number; black: number }>>({});

  const totalBuyInsCents = useMemo(
    () => (data?.buyIns || []).reduce((s: number, b: any) => s + b.amount, 0),
    [data]
  );
  const totalBuyInsDollars = (totalBuyInsCents / 100).toFixed(2);

  const denoms: Denoms | null = data?.denominations
    ? {
        white: data.denominations.white,
        blue: data.denominations.blue,
        red: data.denominations.red,
        green: data.denominations.green,
        black: data.denominations.black,
      }
    : null;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Fetch user profile with display name from database
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch("/api/user", {
          headers: {
            ...(token && { "Authorization": `Bearer ${token}` })
          }
        });
        const userData = await res.json();
        setDisplayName(userData.displayName || user?.email?.split("@")[0] || "");
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setDisplayName(user?.email?.split("@")[0] || "");
      }
    };
    getUser();
  }, []);

  const handleEditName = async () => {
    if (!displayName.trim()) return;
    setEditNameLoading(true);
    try {
      // Get the session token to send with the request
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Save display name to database
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || errorData.error || "Failed to save display name");
      }
      // Refetch user profile to confirm save
      const confirmRes = await fetch("/api/user", {
        headers: { 
          ...(token && { "Authorization": `Bearer ${token}` })
        }
      });
      const userData = await confirmRes.json();
      setDisplayName(userData.displayName || user?.email?.split("@")[0] || "");
    } catch (error) {
      console.error("Error saving display name:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setEditNameLoading(false);
      setShowEditName(false);
    }
  };

  const goHome = () => {
    window.location.href = "/";
  };

  // Initialize player chips from data
  useMemo(() => {
    if (data?.players) {
      const newChips: Record<string, any> = {};
      data.players.forEach((p: any) => {
        const existingCount = p.chipCounts?.[0];
        newChips[p.id] = existingCount ? {
          white: existingCount.white,
          blue: existingCount.blue,
          red: existingCount.red,
          green: existingCount.green,
          black: existingCount.black,
        } : {
          white: 0,
          blue: 0,
          red: 0,
          green: 0,
          black: 0,
        };
      });
      setPlayerChips(newChips);
    }
  }, [data?.players]);

  async function submitDenoms(formData: FormData) {
    const body = Object.fromEntries(formData.entries());
    const payload = Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k, Number(v)])
    );
    await fetch(`/api/table/${id}/denoms`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    mutate();
  }

  const onSubmitDenoms: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await submitDenoms(fd);
  };

  const addPlayer = async () => {
    if (!playerName) return;
    
    const payload: any = { name: playerName };
    
    // Check if the entered name matches the current user's display name
    if (user && playerName === displayName) {
      payload.userId = user.id;
    }
    
    await fetch(`/api/table/${id}/players`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setPlayerName("");
    mutate();
  };

  const addBuyIn = async () => {
    const amount = Math.round(Number(rebuyAmt) * 100);
    if (!rebuyPlayer || !amount) return;
    await fetch(`/api/table/${id}/buyin`, {
      method: "POST",
      body: JSON.stringify({ playerId: rebuyPlayer, amount }),
    });
    setRebuyAmt("");
    mutate();
  };

  const updatePlayerChip = (playerId: string, color: keyof Denoms, value: number) => {
    setPlayerChips(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [color]: value,
      }
    }));
  };

  const savePlayerChips = async (playerId: string) => {
    const chips = playerChips[playerId];
    if (!chips) return;

    await fetch(`/api/table/${id}/chipcounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        white: chips.white,
        blue: chips.blue,
        red: chips.red,
        green: chips.green,
        black: chips.black,
      }),
    });
    
    mutate();
  };

  const reconcile = async () => {
    const r = await fetch(`/api/table/${id}/reconcile`);
    const j = await r.json();
  
    if (j.error) {
      alert(j.error);
      return;
    }
  
    let msg =
      `${j.message}\n\n` +
      `Total Buy-ins: $${j.buyInDollars.toFixed(2)}\n` +
      `Chip Total: $${j.chipTotalDollars.toFixed(2)}\n` +
      `Delta: $${j.delta.toFixed(2)}\n\n` +
      `--- Individual Stacks ---\n`;
  
    j.playerStacks.forEach((p: any) => {
      msg += `${p.playerName}: $${p.chipValue.toFixed(2)} (${p.white}W ${p.blue}B ${p.red}R ${p.green}G ${p.black}Blk)\n`;
    });
  
    alert(msg);
  };
  

  if (!id) return <main className="p-6 text-gray-900 dark:text-white">Loading…</main>;

  return (
    <main className="min-h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-black border-b border-slate-700">
        <div className="px-6 py-4 flex justify-between items-center">
          <button
            onClick={goHome}
            className="text-2xl font-bold text-white hover:text-slate-300 transition"
          >
            Poker Ledger
          </button>
          
          {user && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowEditName(!showEditName)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
              >
                <span className="text-lg">👤</span>
                <span className="text-sm font-medium truncate max-w-[150px]">{displayName || user.email}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div>
      {!data ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <>
          {/* Denominations */}
          <section className="bg-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-700">
            <h2 className="text-xl font-semibold text-white">Table · {data.name}</h2>

            <form onSubmit={onSubmitDenoms} className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(["white", "blue", "red", "green", "black"] as const).map((c) => (
                <div key={c} className="space-y-1">
                  <label className="text-sm capitalize text-slate-300">{c} ($/chip)</label>
                  <input
                    name={c}
                    type="number"
                    min={0.01}
                    step={0.01}
                    defaultValue={data.denominations?.[c] ?? (c === "white" ? 0.25 : c === "blue" ? 0.5 : c === "red" ? 1 : c === "green" ? 2 : 5)}
                    className="border border-slate-600 rounded px-3 py-2 w-full bg-slate-700 text-white"
                  />
                </div>
              ))}
              <div className="col-span-full">
                <button className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition">
                  Save Denominations
                </button>
              </div>
            </form>
          </section>

          {/* Players */}
          <section className="bg-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-700 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Players</h3>
              <div className="text-sm text-slate-300">
                Total Buy-ins: <strong className="text-white">${totalBuyInsDollars}</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-600 rounded px-3 py-2 bg-slate-700 text-white placeholder:text-slate-400"
                placeholder="Enter player name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                list="available-users"
              />
              <datalist id="available-users">
                {user && displayName && (
                  <option value={displayName}>{displayName} (You)</option>
                )}
              </datalist>
              <button 
                onClick={addPlayer} 
                disabled={!playerName}
                className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-600">
                    <th className="py-2 text-white">Name</th>
                    <th className="py-2 text-white">Buy-ins</th>
                    <th className="py-2 text-white">Total ($)</th>
                    <th className="py-2 text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.players.map((p: any) => {
                    const cents = p.buyIns.reduce((s: number, b: any) => s + b.amount, 0);
                    return (
                      <tr key={p.id} className="border-b border-slate-700">
                        <td className="py-2 text-white">{p.name}</td>
                        <td className="py-2 text-slate-300">
                          <details className="cursor-pointer">
                            <summary>{p.buyIns.length} buy-ins</summary>
                            <ul className="mt-2 space-y-1 ml-4">
                              {p.buyIns.map((buyIn: any) => (
                                <li key={buyIn.id} className="flex items-center gap-2 text-xs">
                                  <span>${(buyIn.amount / 100).toFixed(2)}</span>
                                  <button
                                    onClick={async () => {
                                      if (confirm('Delete this buy-in?')) {
                                        await fetch(`/api/table/${id}/buyin?buyInId=${buyIn.id}`, {
                                          method: 'DELETE',
                                        });
                                        mutate();
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    ✕
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </details>
                        </td>
                        <td className="py-2 text-gray-700 dark:text-gray-300">{(cents / 100).toFixed(2)}</td>
                        <td className="py-2">
                          <button
                            onClick={async () => {
                              if (confirm(`Remove ${p.name}?`)) {
                                await fetch(`/api/table/${id}/players?playerId=${p.id}`, {
                                  method: 'DELETE',
                                });
                                mutate();
                              }
                            }}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-xs"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rebuy - now allows negative amounts */}
            <div className="flex flex-wrap gap-2 pt-2">
              <select
                value={rebuyPlayer}
                onChange={(e) => setRebuyPlayer(e.target.value)}
                className="border border-gray-300 dark:border-neutral-600 rounded px-3 py-2 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
              >
                <option value="">Select player…</option>
                {data.players.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                className="border border-gray-300 dark:border-neutral-600 rounded px-3 py-2 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder:text-gray-500"
                placeholder="Amount ($, can be negative)"
                value={rebuyAmt}
                onChange={(e) => setRebuyAmt(e.target.value)}
              />
              <button onClick={addBuyIn} className="px-4 py-2 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition">
                Add Buy-in
              </button>
            </div>
          </section>

          {/* Player Chip Counts Table */}
          <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Player Chip Counts
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-300 dark:border-neutral-600">
                    <th className="py-2 text-gray-900 dark:text-white">Player</th>
                    <th className="py-2 text-gray-900 dark:text-white">White</th>
                    <th className="py-2 text-gray-900 dark:text-white">Blue</th>
                    <th className="py-2 text-gray-900 dark:text-white">Red</th>
                    <th className="py-2 text-gray-900 dark:text-white">Green</th>
                    <th className="py-2 text-gray-900 dark:text-white">Black</th>
                  </tr>
                </thead>
                <tbody>
                  {data.players.map((p: any) => {
                    const chips = playerChips[p.id] || { white: 0, blue: 0, red: 0, green: 0, black: 0 };
                    return (
                      <tr key={p.id} className="border-b border-gray-200 dark:border-neutral-700">
                        <td className="py-2 text-gray-900 dark:text-white">{p.name}</td>
                        {(["white", "blue", "red", "green", "black"] as const).map((color) => (
                          <td key={color} className="py-2">
                          <input
                            type="number"
                            min={0}
                            value={chips[color] || ""}
                            placeholder="0"
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : Number(e.target.value);
                              updatePlayerChip(p.id, color, value);
                            }}
                            onBlur={() => savePlayerChips(p.id)}
                            className="border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 w-20 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                          />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {denoms && (
              <p className="text-sm text-slate-400">
                Current denominations — W:${denoms.white} B:${denoms.blue} R:${denoms.red} G:${denoms.green} Blk:${denoms.black}
              </p>
            )}
          </section>

          {/* Reconcile */}
          <section className="bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-700 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Reconcile</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Compare total buy-ins vs. total chip values
                </p>
              </div>
              <button 
                type="button" 
                onClick={reconcile} 
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition font-semibold"
              >
                Reconcile Now
              </button>
            </div>
          </section>

          {/* End Game - Only visible to host */}
          {user && data.hostId === user.id && (
            <section className="bg-red-900 bg-opacity-20 rounded-2xl shadow-2xl p-6 border border-red-700 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">End Game</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Archive this game and save results to player history
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={async () => {
                    if (!confirm('Are you sure you want to end this game? This will archive all results and delete the active table.')) return;
                    
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const token = session?.access_token;
                      
                      const res = await fetch(`/api/table/${id}/archive`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token && { 'Authorization': `Bearer ${token}` })
                        }
                      });
                      
                      if (res.ok) {
                        alert('Game ended and archived successfully!');
                        window.location.href = '/';
                      } else {
                        const error = await res.json();
                        alert(error.error || 'Failed to end game');
                      }
                    } catch (error) {
                      console.error('Error ending game:', error);
                      alert('Failed to end game');
                    }
                  }}
                  className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white transition font-semibold"
                >
                  End Game
                </button>
              </div>
            </section>
          )}
        </>
      )}
        </div>
      </div>

      {/* Edit Name Modal */}
      {showEditName && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Edit Display Name</h3>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition mb-4"
              placeholder="Enter display name"
            />
            <div className="flex gap-3">
              <button
                onClick={handleEditName}
                disabled={editNameLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 transition"
              >
                {editNameLoading ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setShowEditName(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}