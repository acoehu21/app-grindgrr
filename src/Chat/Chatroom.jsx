import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "../App.css";
// Import Lucide icons
import { ArrowLeft, Dog, MessageCircle, UserRoundPen, Send } from 'lucide-react';

const Chatroom = () => {
    const navigate = useNavigate();
    const { chatId } = useParams(); // Get chat ID from URL
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    const messagesEndRef = useRef(null); // Ref for scrolling to the latest message

    useEffect(() => {
        // Fetch current user
        const fetchUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                console.error("Error fetching user:", error);
                setError("Could not fetch user.");
            } else {
                setCurrentUserId(user?.id || null);
            }
        };

        fetchUser();
    }, []);

    useEffect(() => {
        if (!chatId || !currentUserId) return; // Don't fetch messages if chatId or userId is missing

        setLoading(true);
        setError(null);

        // Fetch existing messages
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    id,
                    sender_id,
                    content,
                    created_at,
                    profiles!messages_sender_id_fkey ( username, avatar_url )
                `)
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error("Error fetching messages:", error);
                setError("Could not fetch messages.");
            } else {
                setMessages(data || []);
            }
            setLoading(false);
        };

        fetchMessages();

        // Set up real-time subscription
        const subscription = supabase
            .channel(`chatroom_${chatId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
                (payload) => {
                    console.log("Real-time: New message payload received:", payload);

                    const newMessageData = payload.new;

                    // Fetch the full message data (including profile)
                    console.log("Real-time: New message detected, fetching full data...", newMessageData);
                    supabase
                        .from('messages')
                        .select(`
                            id,
                            sender_id,
                            content,
                            created_at,
                            profiles!messages_sender_id_fkey ( username, avatar_url )
                        `)
                        .eq('id', newMessageData.id) // Fetch by the new message's ID
                        .single()
                        .then(({ data: fullMessageData, error: fetchError }) => {
                            if (fetchError) {
                                console.error("Error fetching full message data for real-time update:", fetchError);
                                // Optionally add the message without profile data if fetch fails
                                setMessages(latestMessages => {
                                    const messagesWithFallback = [...latestMessages, newMessageData];
                                    // Filter out duplicates after adding
                                    return messagesWithFallback.filter((msg, index, self) =>
                                        index === self.findIndex((m) => m.id === msg.id)
                                    );
                                });
                            } else if (fullMessageData) {
                                setMessages(latestMessages => {
                                    const messagesWithNew = [...latestMessages, fullMessageData];
                                    // Filter out duplicates after adding
                                    return messagesWithNew.filter((msg, index, self) =>
                                        index === self.findIndex((m) => m.id === msg.id)
                                    );
                                });
                            }
                        })
                        .catch(fetchError => {
                            console.error("Error in fetch promise for real-time update:", fetchError);
                            // Fallback if the fetch promise itself fails
                            setMessages(latestMessages => {
                                const messagesWithFallback = [...latestMessages, newMessageData];
                                // Filter out duplicates after adding
                                return messagesWithFallback.filter((msg, index, self) =>
                                    index === self.findIndex((m) => m.id === msg.id)
                                );
                            });
                        });
                }
            )
            .subscribe();

        // Cleanup subscription on component unmount
        return () => {
            supabase.removeChannel(subscription);
        };

    }, [chatId, currentUserId]); // Re-run effect if chatId or currentUserId changes

    // Scroll to the latest message whenever messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleBack = () => {
        navigate("/chat");
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserId || !chatId) return; // Don't send empty messages

        setError(null);

        const { data, error } = await supabase
            .from('messages')
            .insert([
                {
                    chat_id: chatId,
                    sender_id: currentUserId,
                    content: newMessage.trim()
                }
            ]);

        if (error) {
            console.error("Error sending message:", error);
            setError("Could not send message.");
        } else {
            setNewMessage(""); // Clear input field on success
            console.log("Message sent successfully.", data);
        }
    };

    const handleProfileSetup = () => {
        navigate("/profile-setup");
    };

    const handleHome = () => {
        navigate("/");
    };

    const handleChat = () => {
        navigate("/chat");
    };

    return (
        <div className="grindgrr-container">
            <div className="chat-header">
                <button className="back-button" onClick={handleBack} style={{ cursor: 'pointer' }}>
                    <ArrowLeft size={24} />
                </button>
                <h2>Chat with [Dog Name/Match Name]</h2> {/* Placeholder for chat partner name */}
            </div>
            <div className="chat-body">
                {console.log("Rendering chat body. Loading:", loading, "Error:", error, "Messages count:", messages.length, "Messages data:", messages)}
                {loading ? (
                    <p>Loading messages...</p>
                ) : error ? (
                    <p className="error-message">{error}</p>
                ) : messages.length === 0 ? (
                    null
                ) : (
                    messages.map((message, index) => {
                        console.log("Rendering message:", index, message);
                        return (
                            <div key={index} className={`message ${message.sender_id === currentUserId ? 'sent' : 'received'}`}>
                                <div className="message-sender">{message.profiles?.username || 'Unknown User'}</div>
                                <div className="message-content">{message.content}</div>
                                {/* <div className="message-timestamp">{new Date(message.created_at).toLocaleTimeString()}</div> */}
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} /> {/* Element to scroll into view */}
            </div>
            <div className="chat-footer">
                <form onSubmit={handleSendMessage} className="input-row">
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="Type your message here..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className="send-button">
                        <Send size={24} />
                    </button>
                </form>
            </div>
            <div className="nav-bar nav-bar-space-between">
                <button className="nav-btn" onClick={handleProfileSetup}>
                    <UserRoundPen size={32} />
                </button>
                <button className="nav-btn" onClick={handleHome}>
                    <Dog size={32} />
                </button>
                <button className="nav-btn" onClick={handleChat}>
                    <MessageCircle size={32} />
                </button>
            </div>
        </div>
    );
};

export default Chatroom;