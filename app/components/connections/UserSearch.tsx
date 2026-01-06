"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import app from "@/lib/firebase";

interface User {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
}

interface UserSearchProps {
  onSelectUser: (user: User) => void;
  excludeUserIds?: string[];
}

const UserSearch = ({ onSelectUser, excludeUserIds = [] }: UserSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setUsers([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const auth = getAuth(app);
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const idToken = await currentUser.getIdToken();

        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.users && Array.isArray(data.users)) {
            const filteredUsers = data.users.filter(
              (user: User) => !excludeUserIds.includes(user.id)
            );
            setUsers(filteredUsers);
          } else {
            setUsers([]);
            setError("Invalid response format");
          }
        } else {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to search users" }));
          setError(
            errorData.error || `Failed to search users (${response.status})`
          );
          setUsers([]);
        }
      } catch (err) {
        console.error("Error searching users:", err);
        setError("Failed to search users");
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, excludeUserIds]);

  const handleSelectUser = (user: User) => {
    onSelectUser(user);
    setSearchQuery("");
    setUsers([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by name or email..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black font-light"
      />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-light">{error}</p>
        </div>
      )}

      {loading && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 font-light">Searching...</p>
        </div>
      )}

      {!loading &&
        !error &&
        searchQuery.trim().length >= 2 &&
        users.length === 0 && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 font-light">
              No users found matching "{searchQuery}". Try a different search
              term.
            </p>
          </div>
        )}

      {users.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-light text-black">
                  {user.displayName ||
                    `${user.firstName} ${user.lastName}`.trim() ||
                    "Unknown"}
                </span>
                <span className="text-xs font-light text-gray-600">
                  {user.email}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSearch;
