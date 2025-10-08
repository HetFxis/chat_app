"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "../../utils/auth";
import { format } from "date-fns";
import {
  FiSend,
  FiLogOut,
  FiUser,
  FiMessageSquare,
  FiUsers,
  FiCircle,
  FiSearch,
  FiMoreVertical,
  FiBell,
  FiBellOff,
} from "react-icons/fi";
import {
  subscribeUser,
  unsubscribeUser,
  checkSubscription,
} from "../component/pushSubscription";

export default function Chat() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [ws, setWs] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check authentication
  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
  }, [router]);

  // Check push notification subscription status
  useEffect(() => {
    const checkPushStatus = async () => {
      const isSubscribed = await checkSubscription();
      setIsPushEnabled(isSubscribed);
    };

    if (user) {
      checkPushStatus();
    }
  }, [user]);

  // Load initial messages
  useEffect(() => {
    if (!user) return;

    const loadMessages = async () => {
      try {
        if (typeof window === "undefined") return;

        const response = await api.get("/api/messages");
        setMessages(response.data);
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };

    loadMessages();
  }, [user]);

  // Load private messages when selecting a user
  useEffect(() => {
    if (!selectedUser || !user) return;

    const loadPrivateMessages = async () => {
      try {
        if (typeof window === "undefined") return;

        const response = await api.get(`/api/messages/private/${selectedUser}`);

        setPrivateMessages((prev) => ({
          ...prev,
          [selectedUser]: response.data,
        }));
      } catch (error) {
        console.error("Failed to load private messages:", error);
      }
    };

    // Only load if we don't have messages for this user yet
    if (!privateMessages[selectedUser]) {
      loadPrivateMessages();
    }
  }, [selectedUser, user, privateMessages]);

  // WebSocket connection
  useEffect(() => {
    if (!user) return;

    const websocket = new WebSocket(`ws://localhost:8000/ws/${user.username}`);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "users_update") {
        setOnlineUsers(data.users.filter((u) => u !== user.username));
      } else if (data.type === "message") {
        setMessages((prev) => [
          ...prev,
          {
            content: data.content,
            sender: data.sender,
            timestamp: data.timestamp || new Date().toISOString(),
          },
        ]);
      } else if (data.type === "private_message") {
        // Handle private messages
        const otherUser =
          data.sender === user.username ? data.recipient : data.sender;

        setPrivateMessages((prev) => ({
          ...prev,
          [otherUser]: [
            ...(prev[otherUser] || []),
            {
              content: data.content,
              sender: data.sender,
              timestamp: data.timestamp || new Date().toISOString(),
              isPrivate: true,
              recipient: data.recipient,
            },
          ],
        }));
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
      toast.error("Connection error");
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [user, selectedUser]);

  const sendMessage = () => {
    if (!newMessage.trim() || !ws) return;

    const messageData = {
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: selectedUser ? "private" : "public",
      recipient: selectedUser,
    };

    ws.send(JSON.stringify(messageData));
    setNewMessage("");
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
    if (ws) ws.close();
    router.push("/login");
  };

  const togglePushNotifications = async () => {
    try {
      if (isPushEnabled) {
        // Unsubscribe
        const success = await unsubscribeUser();
        if (success) {
          setIsPushEnabled(false);
          toast.success("Push notifications disabled");
        } else {
          toast.error("Failed to disable push notifications");
        }
      } else {
        // Subscribe
        const success = await subscribeUser();
        if (success) {
          setIsPushEnabled(true);
          toast.success("Push notifications enabled");
        } else {
          toast.error("Failed to enable push notifications");
        }
      }
    } catch (error) {
      console.error("Error toggling push notifications:", error);
      toast.error("Error toggling push notifications");
    }
  };

  const filteredUsers = onlineUsers.filter((u) =>
    u.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get current messages based on selected user
  const getCurrentMessages = () => {
    if (selectedUser) {
      return privateMessages[selectedUser] || [];
    }
    return messages.filter((msg) => !msg.isPrivate);
  };

  // Show loading state during hydration
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h1>
          <p className="text-gray-600">Initializing chat</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - User List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FiUsers className="text-blue-600" />
              Chat App
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={togglePushNotifications}
                className={`${
                  isPushEnabled ? "text-blue-600" : "text-gray-400"
                } hover:text-blue-700 transition`}
                title={
                  isPushEnabled
                    ? "Disable notifications"
                    : "Enable notifications"
                }
              >
                {isPushEnabled ? <FiBell size={20} /> : <FiBellOff size={20} />}
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 transition"
                title="Logout"
              >
                <FiLogOut size={20} />
              </button>
            </div>
          </div>

          {/* Search Users */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border text-black border-gray-200 rounded-lg focus:outline-none 0"
            />
          </div>
        </div>

        {/* Current User */}
        <div className="p-4 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{user.username}</p>
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <FiCircle className="fill-green-500 text-green-500" size={8} />
                Online
              </p>
            </div>
          </div>
        </div>

        {/* Online Users List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Online Users ({filteredUsers.length})
            </h3>

            {/* General Chat */}
            <button
              onClick={() => setSelectedUser(null)}
              className={`w-full p-3 rounded-lg mb-2 flex items-center gap-3 transition ${
                !selectedUser
                  ? "bg-blue-100 border-blue-300"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <FiMessageSquare className="text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-800">General Chat</p>
                <p className="text-xs text-gray-500">Chat with everyone</p>
              </div>
            </button>

            {/* User List */}
            {filteredUsers.map((username) => (
              <button
                key={username}
                onClick={() => setSelectedUser(username)}
                className={`w-full p-3 rounded-lg mb-2 flex items-center gap-3 transition ${
                  selectedUser === username
                    ? "bg-blue-100 border-blue-300"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {username[0].toUpperCase()}
                  </div>
                  <FiCircle
                    className="absolute bottom-0 right-0 fill-green-500 text-green-500"
                    size={10}
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-800">{username}</p>
                  <p className="text-xs text-gray-500">Click to chat</p>
                </div>
              </button>
            ))}

            {filteredUsers.length === 0 && (
              <p className="text-center text-gray-500 mt-4">No users online</p>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedUser ? (
                <>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedUser[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {selectedUser}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Private conversation
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <FiMessageSquare className="text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      General Chat
                    </h3>
                    <p className="text-xs text-gray-500">
                      {onlineUsers.length + 1} members online
                    </p>
                  </div>
                </>
              )}
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
              <button className="text-gray-500 hover:text-gray-700">
                <FiMoreVertical size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {getCurrentMessages().map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.sender === user.username
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
       <div className="flex flex-col">       <div className=" text-gray-500 gap-2 ">
                {message.sender !== user.username && (
                  <p
                    className="text-xs font-semibold items-center items-center-safe
                  mb-1 opacity-75"
                  >
                    {message.sender}
                  </p>
                )}
              </div>
              <div
                className={`max-w-xs lg:max-w-lg px-4 py-1 rounded-lg ${
                  message.sender === user.username
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                <p className="break-words ">{message.content}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {format(new Date(message.timestamp), "HH:mm")}
                </p>
              </div></div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder={
                selectedUser
                  ? `Message ${selectedUser}...`
                  : "Type a message..."
              }
              className="flex-1 px-4 py-2 border text-black
               border-gray-300 rounded-lg focus:outline-none focu-2 focus:ring--500"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !isConnected}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FiSend />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
