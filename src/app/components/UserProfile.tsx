"use client";

import { useAuth } from '../contexts/AuthContext';

export default function UserProfile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm">
      <span className="text-sm text-gray-700 truncate max-w-[200px]">
        {user.email}
      </span>
      <button
        onClick={handleLogout}
        className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-colors"
      >
        Logout
      </button>
    </div>
  );
} 