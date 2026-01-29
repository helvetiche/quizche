"use client";

import { useState } from "react";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";

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

type ConnectionListProps = {
  connections: Connection[];
  currentUserId: string;
  onUpdate: () => void;
};

const ConnectionList = ({
  connections,
  currentUserId,
  onUpdate,
}: ConnectionListProps) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async (connectionId: string) => {
    setLoadingId(connectionId);
    setError(null);

    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();

      const { apiPut } = await import("../../lib/api");
      const response = await apiPut(`/api/connections/${connectionId}`, {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "accept",
        }),
        idToken,
      });

      if (response.ok) {
        onUpdate();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to accept connection");
      }
    } catch (err) {
      console.error("Error accepting connection:", err);
      setError("Failed to accept connection");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (connectionId: string) => {
    setLoadingId(connectionId);
    setError(null);

    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();

      const { apiPut } = await import("../../lib/api");
      const response = await apiPut(`/api/connections/${connectionId}`, {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reject",
        }),
        idToken,
      });

      if (response.ok) {
        onUpdate();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to reject connection");
      }
    } catch (err) {
      console.error("Error rejecting connection:", err);
      setError("Failed to reject connection");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = async (connectionId: string) => {
    if (!confirm("Are you sure you want to remove this connection?")) {
      return;
    }

    setLoadingId(connectionId);
    setError(null);

    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();

      const { apiDelete } = await import("../../lib/api");
      const response = await apiDelete(`/api/connections/${connectionId}`, {
        idToken,
      });

      if (response.ok) {
        onUpdate();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to remove connection");
      }
    } catch (err) {
      console.error("Error removing connection:", err);
      setError("Failed to remove connection");
    } finally {
      setLoadingId(null);
    }
  };

  const pendingIncoming = connections.filter(
    (conn) => conn.status === "pending" && conn.requestedBy !== currentUserId
  );
  const pendingOutgoing = connections.filter(
    (conn) => conn.status === "pending" && conn.requestedBy === currentUserId
  );
  const accepted = connections.filter((conn) => conn.status === "accepted");

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-light">{error}</p>
        </div>
      )}

      {pendingIncoming.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-light text-black">
            Pending Requests ({pendingIncoming.length})
          </h3>
          <div className="flex flex-col gap-2">
            {pendingIncoming.map((conn) => (
              <div
                key={conn.id}
                className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-light text-black">
                    {conn.otherUser.displayName || "Unknown"}
                  </span>
                  <span className="text-xs font-light text-gray-600">
                    {conn.otherUser.email}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(conn.id)}
                    disabled={loadingId === conn.id}
                    className="px-4 py-2 bg-black text-white font-light hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingId === conn.id ? "..." : "Accept"}
                  </button>
                  <button
                    onClick={() => handleReject(conn.id)}
                    disabled={loadingId === conn.id}
                    className="px-4 py-2 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingId === conn.id ? "..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingOutgoing.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-light text-black">
            Sent Requests ({pendingOutgoing.length})
          </h3>
          <div className="flex flex-col gap-2">
            {pendingOutgoing.map((conn) => (
              <div
                key={conn.id}
                className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-light text-black">
                    {conn.otherUser.displayName || "Unknown"}
                  </span>
                  <span className="text-xs font-light text-gray-600">
                    {conn.otherUser.email}
                  </span>
                </div>
                <span className="text-xs font-light text-gray-600">
                  Pending...
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-light text-black">
            Connections ({accepted.length})
          </h3>
          <div className="flex flex-col gap-2">
            {accepted.map((conn) => (
              <div
                key={conn.id}
                className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-light text-black">
                    {conn.otherUser.displayName || "Unknown"}
                  </span>
                  <span className="text-xs font-light text-gray-600">
                    {conn.otherUser.email}
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(conn.id)}
                  disabled={loadingId === conn.id}
                  className="px-4 py-2 bg-red-50 text-red-600 font-light hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingId === conn.id ? "..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {connections.length === 0 && (
        <div className="p-8 bg-white border border-gray-200 rounded-lg text-center">
          <p className="text-gray-600 font-light">
            No connections yet. Send a connection request to get started!
          </p>
        </div>
      )}
    </div>
  );
};

export default ConnectionList;
