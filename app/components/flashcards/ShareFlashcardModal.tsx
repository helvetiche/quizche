"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";
import Modal from "@/components/Modal";

type Connection = {
  id: string;
  otherUserId: string;
  status: "pending" | "accepted" | "blocked";
  otherUser: {
    displayName: string;
    email: string;
  };
};

type ShareFlashcardModalProps = {
  flashcardId: string;
  isOpen: boolean;
  onClose: () => void;
  onShareSuccess?: () => void;
};

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md w-full">
      <div className="bg-amber-50 border-3 border-gray-900 rounded-2xl shadow-[8px_8px_0px_0px_rgba(17,24,39,1)] overflow-hidden">
        {/* Header */}
        <div className="bg-amber-200 border-b-3 border-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]">
              <span className="material-icons text-gray-900">share</span>
            </div>
            <h3 className="text-xl font-black text-gray-900">
              Share Flashcard
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-red-400 rounded-xl flex items-center justify-center border-2 border-gray-900 hover:bg-red-500 transition-colors shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
          >
            <span className="material-icons text-gray-900">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {connections.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-amber-200 rounded-full border-3 border-gray-900 flex items-center justify-center mx-auto mb-4">
                <span className="material-icons-outlined text-gray-700 text-2xl">
                  group_off
                </span>
              </div>
              <p className="text-gray-900 font-bold mb-2">No connections yet</p>
              <p className="text-sm text-gray-600">
                Add connections to share flashcards with them.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto mb-4">
                {connections.map((conn) => (
                  <label
                    key={conn.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedUserIds.includes(conn.otherUserId)
                        ? "bg-amber-200 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)]"
                        : "bg-white border-gray-300 hover:border-gray-900"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                        selectedUserIds.includes(conn.otherUserId)
                          ? "bg-amber-400 border-gray-900"
                          : "bg-white border-gray-400"
                      }`}
                    >
                      {selectedUserIds.includes(conn.otherUserId) && (
                        <span className="material-icons text-gray-900 text-sm">
                          check
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1">
                      <span className="text-sm font-bold text-gray-900">
                        {conn.otherUser.displayName || "Unknown"}
                      </span>
                      <span className="text-xs text-gray-600">
                        {conn.otherUser.email}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-red-100 border-2 border-red-500 rounded-xl mb-4">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-100 border-2 border-green-500 rounded-xl mb-4">
                  <p className="text-sm text-green-700 font-medium">
                    {success}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] hover:shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  disabled={sharing || selectedUserIds.length === 0}
                  className="flex-1 px-5 py-2.5 bg-amber-400 text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(17,24,39,1)] hover:shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sharing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                      Sharing...
                    </>
                  ) : (
                    <>
                      <span className="material-icons text-sm">send</span>
                      Share
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ShareFlashcardModal;
