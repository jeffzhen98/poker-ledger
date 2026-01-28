"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";


export default function Home() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [showEditName, setShowEditName] = useState(false);
  const [editNameLoading, setEditNameLoading] = useState(false);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    // Create a deep history stack to prevent going back
    for (let i = 0; i < 10; i++) {
      window.history.pushState({ page: i }, "", window.location.href);
    }
    
    // Prevent back button by pushing state again when popstate is triggered
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    
    window.addEventListener("popstate", handlePopState);

    // Get current user and load their display name from database
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth";
        return;
      }
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
        setDisplayName(userData.displayName || user.email?.split("@")[0] || "");
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setDisplayName(user.email?.split("@")[0] || "");
      }
      
      // Fetch game history
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const historyRes = await fetch("/api/user/history", {
          headers: {
            ...(token && { "Authorization": `Bearer ${token}` })
          }
        });
        if (historyRes.ok) {
          const history = await historyRes.json();
          setGameHistory(history);
        } else {
          console.error("Failed to fetch game history:", await historyRes.text());
          setGameHistory([]); // Set to empty array on error
        }
      } catch (error) {
        console.error("Error fetching game history:", error);
        setGameHistory([]); // Set to empty array on error
      }
    };

    getUser();

    // Check user session periodically to catch logouts
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user && user !== null) {
        window.location.href = "/auth";
      }
      setUser(user);
    }, 1000);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      clearInterval(interval);
    };
  }, []);

  const create = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch("/api/table", { 
        method: "POST", 
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify({ name }) 
      });
      
      if (!res.ok) {
        const error = await res.json();
        console.error("Error creating table:", error);
        alert(error.error || "Failed to create table");
        setLoading(false);
        return;
      }
      
      const json = await res.json();
      setLoading(false);
      if (json.joinCode) window.location.href = `/table/${json.joinCode}`;
    } catch (error) {
      console.error("Error creating table:", error);
      setLoading(false);
    }
  };

  const joinTable = () => {
    if (joinCode.length === 4) {
      window.location.href = `/table/${joinCode.toUpperCase()}`;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

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
      setDisplayName(userData.displayName || user.email?.split("@")[0] || "");
    } catch (error) {
      console.error("Error saving display name:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setEditNameLoading(false);
      setShowEditName(false);
    }
  };

  return (
    <main className="min-h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Poker Ledger</h1>
          
          {user && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowEditName(!showEditName)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
              >
                <span className="text-lg">👤</span>
                <span className="text-sm font-medium truncate max-w-[150px]">{displayName || user.email}</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Subtitle */}
          <div className="mb-10">
            <p className="text-slate-400">Create a new game and track player performance in real-time</p>
          </div>

          {/* Create Table Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl p-8 border border-slate-700 mb-10">
            <h2 className="text-xl font-semibold text-white mb-6">Start a New Game</h2>
            <div className="flex gap-3">
              <input 
                className="flex-1 px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" 
                placeholder="e.g., Friday Night Game, Casino Night..." 
                value={name} 
                onChange={e=>setName(e.target.value)} 
              />
              <button 
                onClick={create} 
                disabled={!name || loading} 
                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-4">
              💡 Share the game link with other players to join the same table
            </p>
          </div>

          {/* Join Table Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl p-8 border border-slate-700 mb-10">
            <h2 className="text-xl font-semibold text-white mb-6">Join Existing Game</h2>
            <div className="flex gap-3">
              <input 
                className="flex-1 px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition uppercase" 
                placeholder="Enter 4-letter code (e.g., ABCD)" 
                value={joinCode} 
                onChange={e=>setJoinCode(e.target.value.toUpperCase())} 
                maxLength={4}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && joinCode.length === 4) {
                    joinTable();
                  }
                }}
              />
              <button 
                onClick={joinTable} 
                disabled={joinCode.length !== 4} 
                className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Join
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-4">
              🎲 Enter the code from the table host to join their game
            </p>
          </div>

          {/* Game History */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
            <h2 className="text-xl font-semibold text-white mb-6">Your Game History</h2>
            {gameHistory.length === 0 ? (
              <p className="text-slate-400 text-center">No games played yet</p>
            ) : (
              <div className="space-y-4">
                {gameHistory.map((result) => {
                  const profit = result.profitLoss / 100;
                  const isProfit = profit >= 0;
                  
                  return (
                    <div key={result.id} className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{result.gameHistory.tableName}</h3>
                          <p className="text-sm text-slate-400">
                            {new Date(result.gameHistory.endedAt).toLocaleDateString()} at {new Date(result.gameHistory.endedAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className={`text-3xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                          {isProfit ? '+' : ''}{profit.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Buy-in Total</p>
                          <p className="text-white font-semibold">${(result.buyInTotal / 100).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">End Stack</p>
                          <p className="text-white font-semibold">${(result.cashOutAmount / 100).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-600">
                        <p className="text-xs text-slate-400">
                          Chips: {result.chipCountWhite}W {result.chipCountBlue}B {result.chipCountRed}R {result.chipCountGreen}G {result.chipCountBlack}Blk
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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