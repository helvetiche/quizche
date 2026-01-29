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

  if (loading !== undefined && loading !== null) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-600 font-light">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-light text-black">Connections</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 font-light transition-colors ${
              activeTab === "list"
                ? "bg-black text-white"
                : "bg-gray-200 text-black hover:bg-gray-300"
            }`}
          >
            My Connections
          </button>
          <button
            onClick={() => setActiveTab("request")}
            className={`px-4 py-2 font-light transition-colors ${
              activeTab === "request"
                ? "bg-black text-white"
                : "bg-gray-200 text-black hover:bg-gray-300"
            }`}
          >
            Add Connection
          </button>
        </div>
      </div>

      {activeTab === "list" ? (
        <ConnectionList
          connections={connections}
          currentUserId={user?.uid ?? ""}
          onUpdate={() => void fetchConnections()}
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <ConnectionRequest
            onRequestSent={() => void fetchConnections()}
            existingConnectionIds={existingConnectionIds}
          />
        </div>
      )}
    </div>
  );
}
