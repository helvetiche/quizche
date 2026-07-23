/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import ConnectionList from "../../connections/ConnectionList";
import ConnectionRequest from "../../connections/ConnectionRequest";

type Connection = {
  id: string;
  otherUserId: string;
  status: "pending" | "accepted" | "blocked";
  requestedBy: string;
  otherUser: {
    displayName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
};

type StudentConnectionsContentProps = {
  user: any;
};

export default function StudentConnectionsContent({
  user,
}: StudentConnectionsContentProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "request">("list");

  const fetchConnections = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/connections", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok !== undefined && response.ok !== null) {
        const data = await response.json();
        setConnections(data.connections ?? ([] as never[]));
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchConnections();
  }, [fetchConnections]);

  const existingConnectionIds = connections.map((conn) => conn.otherUserId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-amber-100 border-3 border-gray-900 rounded-3xl shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] max-w-2xl mx-auto">
        <div className="w-12 h-12 border-4 border-gray-900 border-t-amber-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-900 font-bold">Loading connections...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-amber-50 border-3 border-gray-900 p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
        <div>
          <div className="flex gap-1.5 mb-2">
            <div className="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-gray-900"></div>
            <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full border-2 border-gray-900"></div>
            <div className="w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-900"></div>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Connections
          </h1>
          <p className="text-sm font-medium text-gray-700 mt-1">
            Connect and collaborate with classmates and teachers.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-2 bg-white border-3 border-gray-900 rounded-full p-1.5 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] self-start md:self-auto">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all ${
              activeTab === "list"
                ? "bg-gray-900 text-amber-100"
                : "bg-amber-100 text-gray-900 hover:bg-amber-200 border-2 border-gray-900"
            }`}
          >
            <span className="material-icons-outlined text-base">people</span>
            <span>My Connections</span>
          </button>
          <button
            onClick={() => setActiveTab("request")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all ${
              activeTab === "request"
                ? "bg-gray-900 text-amber-100"
                : "bg-amber-100 text-gray-900 hover:bg-amber-200 border-2 border-gray-900"
            }`}
          >
            <span className="material-icons-outlined text-base">person_add</span>
            <span>Add Connection</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "list" ? (
        <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
          <ConnectionList
            connections={connections}
            currentUserId={user?.uid ?? ""}
            onUpdate={() => void fetchConnections()}
          />
        </div>
      ) : (
        <div className="bg-amber-50 border-3 border-gray-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
          <ConnectionRequest
            onRequestSent={() => void fetchConnections()}
            existingConnectionIds={existingConnectionIds}
          />
        </div>
      )}
    </div>
  );
}
