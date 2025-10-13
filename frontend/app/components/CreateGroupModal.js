"use client";

import { useState } from "react";
import { FiX, FiUsers, FiCheck } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../utils/auth";

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated, onlineUsers }) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxMembers, setMaxMembers] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

  const handleMemberToggle = (username) => {
    setSelectedMembers(prev => 
      prev.includes(username) 
        ? prev.filter(u => u !== username)
        : [...prev, username]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/api/groups", {
        name: groupName.trim(),
        description: groupDescription.trim(),
        is_private: isPrivate,
        max_members: maxMembers,
        members: selectedMembers
      });

      toast.success("Group created successfully!");
      onGroupCreated(response.data);
      handleClose();
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error(error.response?.data?.detail || "Failed to create group");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setGroupDescription("");
    setSelectedMembers([]);
    setIsPrivate(false);
    setMaxMembers(100);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FiUsers className="text-blue-600" />
            Create Group
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              maxLength={50}
            />
          </div>

          {/* Group Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Enter group description (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black resize-none"
              rows={3}
              maxLength={200}
            />
          </div>

          {/* Group Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Private Group
              </label>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPrivate ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPrivate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Members
              </label>
              <input
                type="number"
                value={maxMembers}
                onChange={(e) => setMaxMembers(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
          </div>

          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Members ({selectedMembers.length} selected)
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
              {onlineUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No users online</p>
              ) : (
                onlineUsers.map((username) => (
                  <div
                    key={username}                      onClick={() => handleMemberToggle(username)}

                    className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {username[0].toUpperCase()}
                      </div>
                      <span className="text-gray-800">{username}</span>
                    </div>
                    <button
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                        selectedMembers.includes(username)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {selectedMembers.includes(username) && <FiCheck size={14} />}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
