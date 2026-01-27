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
    const res = await fetch("/api/table", { method: "POST", body: JSON.stringify({ name }) });
    const json = await res.json();
    setLoading(false);
    if (json.id) window.location.href = `/table/${json.id}`;
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

          {/* Placeholder for history */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
            <p className="text-slate-400">Your game history will appear here</p>
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