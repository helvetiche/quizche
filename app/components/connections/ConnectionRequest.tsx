"use client";

import { useState } from "react";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import UserSearch from "./UserSearch";

type User = {
  id: string;
  email: string;
  displayName: string;
};

type ConnectionRequestProps = {
  onRequestSent: () => void;
  existingConnectionIds?: string[];
};

const ConnectionRequest = ({
  onRequestSent,
  existingConnectionIds = [],
}: ConnectionRequestProps) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setError(null);
    setSuccess(null);
  };

  const handleSendRequest = async () => {
    if (!selectedUser) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();

      const { apiPost } = await import("../../lib/api");
      const response = await apiPost("/api/connections", {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
        }),
        idToken,
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(
          data.status === "accepted"
            ? "Connection accepted!"
            : "Connection request sent!"
        );
        setSelectedUser(null);
        setTimeout(() => {
          onRequestSent();
          setSuccess(null);
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to send connection request");
      }
    } catch (err) {
      console.error("Error sending connection request:", err);
      setError("Failed to send connection request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl font-light text-black">Send Connection Request</h3>

      <UserSearch
        onSelectUser={handleSelectUser}
        excludeUserIds={existingConnectionIds}
      />

      {selectedUser && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-light text-black">
                {selectedUser.displayName || "Unknown"}
              </span>
              <span className="text-xs font-light text-gray-600">
                {selectedUser.email}
              </span>
            </div>
            <button
              onClick={handleSendRequest}
              disabled={loading}
              className="px-4 py-2 bg-black text-white font-light hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Request"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-light">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600 font-light">{success}</p>
        </div>
      )}
    </div>
  );
};

export default ConnectionRequest;
