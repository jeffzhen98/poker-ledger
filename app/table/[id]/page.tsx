"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

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

  const { data, mutate } = useSWR(id ? `/api/table/${id}` : null, fetcher, {
    refreshInterval: 2500,
  });

  const [playerName, setPlayerName] = useState("");
  const [rebuyAmt, setRebuyAmt] = useState("");
  const [rebuyPlayer, setRebuyPlayer] = useState("");

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
    await fetch(`/api/table/${id}/players`, {
      method: "POST",
      body: JSON.stringify({ name: playerName }),
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
    <main className="space-y-6">
      {!data ? (
        <div className="text-gray-900 dark:text-white">Loading…</div>
      ) : (
        <>
          {/* Denominations */}
          <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Table · {data.name}</h2>

            <form onSubmit={onSubmitDenoms} className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(["white", "blue", "red", "green", "black"] as const).map((c) => (
                <div key={c} className="space-y-1">
                  <label className="text-sm capitalize text-gray-700 dark:text-gray-300">{c} ($/chip)</label>
                  <input
                    name={c}
                    type="number"
                    min={0.01}
                    step={0.01}
                    defaultValue={data.denominations?.[c] ?? (c === "white" ? 0.25 : c === "blue" ? 0.5 : c === "red" ? 1 : c === "green" ? 2 : 5)}
                    className="border border-gray-300 dark:border-neutral-600 rounded px-3 py-2 w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                  />
                </div>
              ))}
              <div className="col-span-full">
                <button className="px-4 py-2 rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition">
                  Save Denominations
                </button>
              </div>
            </form>
          </section>

          {/* Players */}
          <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Players</h3>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Total Buy-ins: <strong className="text-gray-900 dark:text-white">${totalBuyInsDollars}</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                className="border border-gray-300 dark:border-neutral-600 rounded px-3 py-2 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder:text-gray-500"
                placeholder="Player name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <button onClick={addPlayer} className="px-4 py-2 rounded-2xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition">
                Add
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-300 dark:border-neutral-600">
                    <th className="py-2 text-gray-900 dark:text-white">Name</th>
                    <th className="py-2 text-gray-900 dark:text-white">Buy-ins</th>
                    <th className="py-2 text-gray-900 dark:text-white">Total ($)</th>
                    <th className="py-2 text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.players.map((p: any) => {
                    const cents = p.buyIns.reduce((s: number, b: any) => s + b.amount, 0);
                    return (
                      <tr key={p.id} className="border-b border-gray-200 dark:border-neutral-700">
                        <td className="py-2 text-gray-900 dark:text-white">{p.name}</td>
                        <td className="py-2 text-gray-700 dark:text-gray-300">
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
                            value={chips[color]}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : Number(e.target.value);
                              updatePlayerChip(p.id, color, value);
                            }}
                            onBlur={() => savePlayerChips(p.id)}
                            onClick={(e) => e.currentTarget.select()}
                            onFocus={(e) => e.currentTarget.select()}
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
              <p className="text-sm text-gray-700 dark:text-gray-400">
                Current denominations — W:${denoms.white} B:${denoms.blue} R:${denoms.red} G:${denoms.green} Blk:${denoms.black}
              </p>
            )}
          </section>

          {/* Reconcile */}
          <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reconcile</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Compare total buy-ins vs. total chip values
                </p>
              </div>
              <button 
                type="button" 
                onClick={reconcile} 
                className="px-6 py-3 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition font-semibold"
              >
                Reconcile Now
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}