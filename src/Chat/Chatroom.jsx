import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "../App.css";
import { ArrowLeft, Dog, MessageCircle, UserRoundPen, Send } from 'lucide-react';

/**
 * Chatroom component for displaying and managing a real-time chat session.
 * @returns {JSX.Element} The rendered Chatroom component.
 */
const Chatroom = () => {
    const navigate = useNavigate();
    const { chatId } = useParams(); // The chat session ID from the URL
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [match, setMatch] = useState(null); // State for match data
    const [dogNames, setDogNames] = useState({}); // State for dog names { dogId: dogName }
    const messagesEndRef = useRef(null); // Ref for scrolling to the latest message

    useEffect(() => {
        /**
         * Fetches the current user from Supabase and updates state.
         * @returns {Promise<void>}
         */
        const fetchUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                setError("Could not fetch user.");
            } else {
                setCurrentUserId(user?.id || null);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (!chatId || !currentUserId) return;

        setLoading(true);
        setError(null);

        /**
         * Fetches match, dog, and message data for the chatroom.
         * @returns {Promise<void>}
         */
        const fetchData = async () => {
            try {
                // Fetch match_id from chats table using chatId
                const { data: chatData, error: chatError } = await supabase
                    .from('chats')
                    .select('match_id')
                    .eq('id', chatId)
                    .single();

                if (chatError) {
                    setError("Could not fetch chat details.");
                    setLoading(false);
                    return;
                }

                const matchId = chatData?.match_id;
                if (!matchId) {
                    setError("Match not found for this chat.");
                    setLoading(false);
                    return;
                }

                // Fetch match details from matches table
                const { data: matchData, error: matchError } = await supabase
                    .from('matches')
                    .select('id, dog1_id, owner1_id, dog2_id, owner2_id')
                    .eq('id', matchId)
                    .single();

                if (matchError) {
                    setError("Could not fetch match details.");
                    setLoading(false);
                    return;
                }

                setMatch(matchData);

                // Fetch dog names and photos
                const dogIds = [matchData.dog1_id, matchData.dog2_id].filter(Boolean);
                const { data: dogProfilesData, error: dogProfilesError } = await supabase
                    .from('dog_profiles')
                    .select('id, name, photo')
                    .in('id', dogIds);

                if (!dogProfilesError) {
                    const namesAndPhotosMap = dogProfilesData.reduce((acc, dog) => {
                        acc[dog.id] = { name: dog.name, photo: dog.photo };
                        return acc;
                    }, {});
                    setDogNames(namesAndPhotosMap);
                }

                // Fetch existing messages
                const { data: messagesData, error: messagesError } = await supabase
                    .from('messages')
                    .select(`
                        id,
                        chat_id,
                        sender_id,
                        content,
                        created_at,
                        profiles!messages_sender_id_fkey ( username, avatar_url )
                    `)
                    .eq('chat_id', chatId)
                    .order('created_at', { ascending: true });

                if (messagesError) {
                    setError("Could not fetch messages.");
                } else {
                    setMessages(messagesData || []);
                }

            } catch (err) {
                setError("An error occurred while loading chat data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Set up real-time subscription for new messages
        const subscription = supabase
            .channel(`chatroom_${chatId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
                (payload) => {
                    const newMessageData = payload.new;
                    // Fetch the full message data (including profile)
                    supabase
                        .from('messages')
                        .select(`
                            id,
                            sender_id,
                            content,
                            created_at,
                            profiles!messages_sender_id_fkey ( username, avatar_url )
                        `)
                        .eq('id', newMessageData.id)
                        .single()
                        .then(({ data: fullMessageData, error: fetchError }) => {
                            if (fetchError) {
                                setMessages(latestMessages => {
                                    const messagesWithFallback = [...latestMessages, newMessageData];
                                    return messagesWithFallback.filter((msg, index, self) =>
                                        index === self.findIndex((m) => m.id === msg.id)
                                    );
                                });
                            } else if (fullMessageData) {
                                setMessages(latestMessages => {
                                    const messagesWithNew = [...latestMessages, fullMessageData];
                                    return messagesWithNew.filter((msg, index, self) =>
                                        index === self.findIndex((m) => m.id === msg.id)
                                    );
                                });
                            }
                        })
                        .catch(fetchError => {
                            setMessages(latestMessages => {
                                const messagesWithFallback = [...latestMessages, newMessageData];
                                return messagesWithFallback.filter((msg, index, self) =>
                                    index === self.findIndex((m) => m.id === msg.id)
                                );
                            });
                        });
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(subscription);
        };

    }, [chatId, currentUserId]);

    useEffect(() => {
        // Scrolls to the latest message when messages update.
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    /**
     * Navigates back to the chat list.
     * @returns {void}
     */
    const handleBack = () => {
        navigate("/chat");
    };

    /**
     * Sends a new message to the chat.
     * @param {React.FormEvent} e - The form submission event.
     * @returns {Promise<void>}
     */
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserId || !chatId) return;

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
            setError("Could not send message.");
        } else {
            setNewMessage("");
        }
    };

    /**
     * Navigates to the profile setup page.
     * @returns {void}
     */
    const handleProfileSetup = () => {
        navigate("/profile-setup");
    };

    /**
     * Navigates to the home page.
     * @returns {void}
     */
    const handleHome = () => {
        navigate("/");
    };

    /**
     * Navigates to the chat list page.
     * @returns {void}
     */
    const handleChat = () => {
        navigate("/chat");
    };

    /**
     * Gets the dog data (name and photo) for a given sender.
     * @param {string} senderId - The sender's user ID.
     * @returns {{name: string, photo: string|null}} The dog's name and photo URL, or defaults if not found.
     */
    const getDogDataForSender = (senderId) => {
        if (!match || !dogNames || !senderId) return { name: 'Unknown Dog', photo: null };

        if (match.owner1_id === senderId && match.dog1_id) {
            return dogNames[match.dog1_id] || { name: 'Unknown Dog', photo: null };
        } else if (match.owner2_id === senderId && match.dog2_id) {
            return dogNames[match.dog2_id] || { name: 'Unknown Dog', photo: null };
        }

        return { name: 'Unknown Dog', photo: null };
    };

    return (
        <div className="grindgrr-container">
            <div className="chat-header">
                <button className="back-button" onClick={handleBack} style={{ cursor: 'pointer' }}>
                    <ArrowLeft size={24} />
                </button>
                {/* Display chat partner name and photo once fetched */}
                {
                    match ?
                        (() => {
                            const otherOwnerId = match.owner1_id === currentUserId ? match.owner2_id : match.owner1_id;
                            const otherDogData = getDogDataForSender(otherOwnerId);
                            return (
                                <div className="chat-partner-info">
                                    {otherDogData.photo ? (
                                        <img
                                            src={otherDogData.photo}
                                            alt="Chat partner dog profile"
                                            className="chat-partner-photo"
                                        />
                                    ) : (
                                        <Dog size={40} className="chat-partner-icon" />
                                    )}
                                    <h2>{otherDogData.name || 'Dog Name N/A'}</h2>
                                </div>
                            );
                        })()
                        : <h2>Loading...</h2>
                }
            </div>
            <div className="chat-body">
                {loading ? (
                    <p>Loading messages...</p>
                ) : error ? (
                    <p className="error-message">{error}</p>
                ) : messages.length === 0 ? (
                    null
                ) : (
                    messages.map((message, index) => {
                        const senderDogData = getDogDataForSender(message.sender_id);
                        return (
                            <div key={index} className={`message ${message.sender_id === currentUserId ? 'sent' : 'received'}`}>
                                <div className="message-sender">{senderDogData.name || message.profiles?.username || 'Unknown User'}</div>
                                <div className="message-content">{message.content}</div>
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