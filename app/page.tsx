"use client";
import { useState } from "react";


export default function Home() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);


  const create = async () => {
    setLoading(true);
    const res = await fetch("/api/table", { method: "POST", body: JSON.stringify({ name }) });
    const json = await res.json();
    setLoading(false);
    if (json.id) window.location.href = `/table/${json.id}`;
  };


  return (
    <main className="space-y-6">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create a New Table</h2>
        <div className="flex gap-3">
          <input 
            className="border border-gray-300 dark:border-neutral-600 rounded px-3 py-2 w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder:text-gray-500" 
            placeholder="Table name (e.g., Friday Night Home Game)" 
            value={name} 
            onChange={e=>setName(e.target.value)} 
          />
          <button 
            onClick={create} 
            disabled={!name || loading} 
            className="px-4 py-2 rounded-2xl bg-black dark:bg-white text-white dark:text-black disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>


      <div className="text-sm text-gray-700 dark:text-neutral-400">
        Share the URL with players to join the same ledger.
      </div>
    </main>
  );
}