"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";

interface Connection {
  id: string;
  otherUserId: string;
  status: "pending" | "accepted" | "blocked";
  otherUser: {
    displayName: string;
    email: string;
  };
}

interface ShareFlashcardModalProps {
  flashcardId: string;
  isOpen: boolean;
  onClose: () => void;
  onShareSuccess?: () => void;
}

const ShareFlashcardModal = ({
  flashcardId,
  isOpen,
  onClose,
  onShareSuccess,
}: ShareFlashcardModalProps) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConnections();
    }
  }, [isOpen]);

  const fetchConnections = async () => {
    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();

      const { apiGet } = await import("../../lib/api");
      const response = await apiGet("/api/connections", {
        idToken,
      });

      if (response.ok) {
        const data = await response.json();
        const acceptedConnections = (data.connections || []).filter(
          (conn: Connection) => conn.status === "accepted"
        );
        setConnections(acceptedConnections);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleShare = async () => {
    if (selectedUserIds.length === 0) {
      setError("Please select at least one connection");
      return;
    }

    setSharing(true);
    setError(null);
    setSuccess(null);

    try {
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const idToken = await currentUser.getIdToken();

      const { apiPost } = await import("../../lib/api");
      const response = await apiPost(`/api/flashcards/${flashcardId}/share`, {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIds: selectedUserIds,
        }),
        idToken,
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(
          `Flashcard shared with ${
            data.sharedWith?.length || selectedUserIds.length
          } user(s)`
        );
        setSelectedUserIds([]);
        setTimeout(() => {
          onShareSuccess?.();
          onClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to share flashcard");
      }
    } catch (err) {
      console.error("Error sharing flashcard:", err);
      setError("Failed to share flashcard");
    } finally {
      setSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-light text-black">Share Flashcard</h3>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-black transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {connections.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 font-light mb-4">
                You don't have any connections yet.
              </p>
              <p className="text-sm text-gray-500 font-light">
                Add connections to share flashcards with them.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {connections.map((conn) => (
                  <label
                    key={conn.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(conn.otherUserId)}
                      onChange={() => handleToggleUser(conn.otherUserId)}
                      className="w-4 h-4 border-gray-300 focus:ring-black"
                    />
                    <div className="flex flex-col gap-1 flex-1">
                      <span className="text-sm font-light text-black">
                        {conn.otherUser.displayName || "Unknown"}
                      </span>
                      <span className="text-xs font-light text-gray-600">
                        {conn.otherUser.email}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

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

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-200 text-black font-light hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  disabled={sharing || selectedUserIds.length === 0}
                  className="flex-1 px-4 py-2 bg-black text-white font-light hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sharing ? "Sharing..." : "Share"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareFlashcardModal;
