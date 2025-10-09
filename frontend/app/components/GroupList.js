"use client";

import { useState, useEffect } from "react";
import { FiUsers, FiPlus, FiLock, FiGlobe, FiMoreVertical, FiSettings, FiUserPlus, FiLogOut } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../utils/auth";

export default function GroupList({ 
  groups, 
  selectedGroup, 
  onGroupSelect, 
  onCreateGroup, 
  user,
  onGroupUpdate 
}) {
  const [showGroupMenu, setShowGroupMenu] = useState(null);

  const handleLeaveGroup = async (groupId) => {
    try {
      await api.delete(`/api/groups/${groupId}/leave`);
      toast.success("Left group successfully");
      onGroupUpdate();
    } catch (error) {
      console.error("Failed to leave group:", error);
      toast.error("Failed to leave group");
    }
    setShowGroupMenu(null);
  };

  const getGroupInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isGroupAdmin = (group) => {
    return group.created_by === user?.id;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on the menu button or menu itself
      if (!event.target.closest('.group-menu-container')) {
        setShowGroupMenu(null);
      }
    };
    
    if (showGroupMenu !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showGroupMenu]);

  return (
    <div className="space-y-2">
      {/* Create Group Button */}
      <button
        onClick={onCreateGroup}
        className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
      >
        <FiPlus size={20} />
        <span className="font-medium">Create Group</span>
      </button>

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="text-center py-8">
          <FiUsers className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-500">No groups yet</p>
          <p className="text-sm text-gray-400">Create your first group to get started</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.id} className="relative">
            <div
              className={`w-full p-3 rounded-lg flex items-center gap-3 transition cursor-pointer ${
                selectedGroup?.id === group.id
                  ? "bg-blue-100 border-blue-300"
                  : "hover:bg-gray-50"
              }`}
            >
              <div 
                className="flex items-center gap-3 flex-1"
                onClick={() => onGroupSelect(group)}
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {getGroupInitials(group.name)}
                  </div>
                  <div className="absolute -bottom-1 -right-1">
                    {group.is_private ? (
                      <FiLock className="text-gray-500 bg-white rounded-full p-0.5" size={14} />
                    ) : (
                      <FiGlobe className="text-green-500 bg-white rounded-full p-0.5" size={14} />
                    )}
                  </div>
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800 truncate">{group.name}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {group.member_count || 0} members
                    </p>
                    {isGroupAdmin(group) && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-xs text-gray-400 truncate mt-1">
                      {group.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="group-menu-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGroupMenu(showGroupMenu === group.id ? null : group.id);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 ml-2"
                >
                  <FiMoreVertical size={16} />
                </button>
              </div>
            </div>

            {/* Group Menu */}
            {showGroupMenu === group.id && (
              <div className="group-menu-container absolute right-2 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                {isGroupAdmin(group) && (
                  <>
                    <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                      <FiSettings size={16} />
                      Group Settings
                    </button>
                    <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                      <FiUserPlus size={16} />
                      Add Members
                    </button>
                    <hr className="border-gray-200" />
                  </>
                )}
                <button
                  onClick={() => handleLeaveGroup(group.id)}
                  className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
                >
                  <FiLogOut size={16} />
                  Leave Group
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
