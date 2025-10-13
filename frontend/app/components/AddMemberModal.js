"use client";

import { useState, useEffect } from "react";
import { FiX, FiUserPlus, FiCheck, FiHash } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../utils/auth";

export default function AddMemberModal({ isOpen, onClose, group, onMemberAdded, onlineUsers }) {
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);

  // Load group members when modal opens
  useEffect(() => {
    if (!isOpen || !group) return;

    const loadGroupMembers = async () => {
      try {
        const response = await api.get(`/api/groups/${group.id}/members`);
        setGroupMembers(response.data);
      } catch (error) {
        console.error("Failed to load group members:", error);
        setGroupMembers([]);
      }
    };

    loadGroupMembers();
  }, [isOpen, group]);

  const handleMemberToggle = (username) => {
    setSelectedMembers(prev => 
      prev.includes(username) 
        ? prev.filter(u => u !== username)
        : [...prev, username]
    );
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member to add");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post(`/api/groups/${group.id}/addmembers`, {
        members: selectedMembers
      });

      toast.success(`Added ${selectedMembers.length} member(s) successfully!`);
      onMemberAdded(response.data);
      handleClose();
    } catch (error) {
      console.error("Failed to add members:", error);
      toast.error(error.response?.data?.detail || "Failed to add members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedMembers([]);
    setGroupMembers([]);
    onClose();
  };

  // Filter out users who are already members of the group
  const availableUsers = onlineUsers.filter(username => 
    !groupMembers.some(member => member.username === username)
  );

  if (!isOpen || !group) return null;

  return (
    <div className=" fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FiUserPlus className="text-blue-600" />
            Add Members to {group.name}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Group Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex  flex-col">
             
              <div className="flex items-center gap-2">
                <FiHash className="text-blue-600 text-lg " />
                <p className="font-semibold   text-xl text-gray-800">{group.name}<span className="text-gray-600 text-sm px-1">(group)</span></p>
              </div>
                <p className="text-sm text-gray-600">
                  {groupMembers.length} current members
                </p>
            </div>
          </div>
          <div className="bg-gray-50 p-3  rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Existing Group Members
            </label>
            <div className="flex flex-col  gap-3">
              {groupMembers.map((member) => (
                <div key={member.id}>
                  <p className="font-semibold text-gray-800">{member.username}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Members to Add ({selectedMembers.length} selected)
            </label>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {availableUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {onlineUsers.length === 0 
                    ? "No users online" 
                    : "All online users are already members of this group"
                  }
                </p>
              ) : (
                availableUsers.map((username) => (
                  <div
                  onClick={() => handleMemberToggle(username)}
                  
                    key={username}
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
            onClick={handleAddMembers}
            disabled={selectedMembers.length === 0 || isLoading || availableUsers.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Adding..." : `Add ${selectedMembers.length} Member(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
