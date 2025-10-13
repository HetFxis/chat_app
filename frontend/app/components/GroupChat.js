"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { FiSend, FiUsers, FiMoreVertical, FiInfo } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../utils/auth";
import AnimatedModel from "../m/page.js";
export default function GroupChat({
  group,
  activeTab,
  user,
  ws,
  isConnected,
  messages,
  onSendMessage,
}) {
  const [newMessage, setNewMessage] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    };

    if (messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(scrollToBottom, 100);
    }
  }, [messages.length]); // Only scroll when message count changes

  // Load group members
  useEffect(() => {
    if (!group) return;

    const loadGroupMembers = async () => {
      try {
        const response = await api.get(`/api/groups/${group.id}/members`);
        setGroupMembers(response.data);
      } catch (error) {
        console.error("Failed to load group members:", error);
      }
    };

    loadGroupMembers();
  }, [group]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !ws || !group) return;

    const messageData = {
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: "group",
      group_id: group.id,
    };

    ws.send(JSON.stringify(messageData));
    onSendMessage(messageData);
    setNewMessage("");
  };

  const getGroupInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FiUsers className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Select a Group
          </h3>
          <p className="text-gray-500">
            Choose a group from the sidebar to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Group Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {getGroupInitials(group.name)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                {group.name}
                {group.is_private && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    Private
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                {groupMembers.length} members
                {group.description && ` • ${group.description}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                isConnected
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {isConnected ? "● Connected" : "● Disconnected"}
            </span>
            <button
              onClick={() => setShowGroupInfo(!showGroupInfo)}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              title="Group Info"
            >
              <FiInfo size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Messages Area */}
        <div
          onClick={() => setShowGroupInfo(false)}
          className="flex-1 flex no-scrollbar flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-2 min-h-full">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center">
                    <div className="  rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                      <AnimatedModel color="#8bc5f7" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      Welcome to {group.name}!
                    </h3>
                    <p className="text-gray-500">
                      This is the beginning of your group conversation.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div
                      key={`${message.sender}-${message.timestamp}-${index}`}
                      className={`flex ${
                        message.sender === user.username
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div className="flex flex-col mt-3 max-w-xs lg:max-w-lg">
                        {message.sender !== user.username && (
                          <div className="text-gray-500 mb-1">
                            <p className="text-xs font-semibold opacity-75">
                              {message.sender}
                            </p>
                          </div>
                        )}
                        <div
                          className={`px-4 py-2 rounded-lg ${
                            message.sender === user.username
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          <p className="break-words">{message.content}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 text-end mr-[2px] mt-1">
                            {format(new Date(message.timestamp), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={`Message ${group.name}...`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none text-black"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !isConnected}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FiSend />
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Group Info Sidebar */}
        {showGroupInfo && activeTab === "groups" && (
          <div
            className="w-80 bg-white border-l border-gray-200 p-6 transform transition-all duration-300 shadow-lg  ease-in-out
 "
          >
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                  {getGroupInitials(group.name)}
                </div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="text-gray-600 mt-2">{group.description}</p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Created {format(new Date(group.created_at), "MMM d, yyyy")}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiUsers size={16} />
                  Members ({groupMembers.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {groupMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {member.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {member.username}
                        </p>
                        {member.id === group.created_by && (
                          <p className="text-xs text-blue-600">Admin</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
