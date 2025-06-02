import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "../App.css";
import { Dog, MessageCircle, UserRoundPen } from 'lucide-react';

const ChatList = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    console.log("Component mounted, fetching matches...");
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setError(null);
      // Get current user with more detailed logging
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log("Auth response:", { authData, authError });

      if (authError) {
        console.error("Auth error:", authError);
        setError("Authentication error: " + authError.message);
        setLoading(false);
        return;
      }

      const user = authData?.user;
      console.log("Current user object:", user);

      if (!user) {
        console.log("No user found in auth data");
        setError("No user found. Please log in.");
        setLoading(false);
        return;
      }

      if (!user.id) {
        console.log("User object has no ID:", user);
        setError("User ID not available.");
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
      console.log("User ID to query:", user.id);

      // Simple query first - just get all matches
      const { data, error: basicError } = await supabase
        .from('matches')
        .select('*');

      console.log("Basic matches query result:", { data, error: basicError });

      if (basicError) {
        console.error('Error fetching matches:', basicError);
        setError("Error fetching matches: " + basicError.message);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        console.log("No matches found in database");
        setLoading(false);
        return;
      }

      // If we got data, try the full query
      const { data: fullData, error: fullError } = await supabase
        .from('matches')
        .select(`
          id,
          dog1_id,
          dog2_id,
          owner1_id,
          owner2_id,
          status,
          created_at,
          dog1:dog_profiles!matches_dog1_id_fkey (*),
          dog2:dog_profiles!matches_dog2_id_fkey (*),
          owner1:profiles!matches_owner1_id_fkey (*),
          owner2:profiles!matches_owner2_id_fkey (*)
        `)
        .or(`owner1_id.eq.${user.id},owner2_id.eq.${user.id}`)
        .eq('status', 'active');

      console.log("Full matches query result:", { fullData, fullError });

      if (fullError) {
        console.error('Error in full query:', fullError);
        setError("Error fetching match details: " + fullError.message);
        return;
      }

      setMatches(fullData || []);
      console.log("Matches set to state:", fullData);
    } catch (error) {
      console.error('Error in fetchMatches:', error);
      setError("Unexpected error: " + error.message);
    } finally {
      setLoading(false);
      console.log("Loading state set to false");
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

  const handleMatchClick = async (matchId) => {
    try {
      // Find the match object
      const match = matches.find(m => m.id === matchId);
      if (!match) {
        console.error("Match not found for ID:", matchId);
        return;
      }

      // Check if a chat session already exists for this match
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .eq('match_id', matchId)
        .single();

      if (chatError && chatError.code !== 'PGRST116') { // PGRST116 means no rows found (expected if chat doesn't exist)
        console.error('Error checking for existing chat:', chatError);
        throw chatError;
      }

      let chatId;

      if (chatData) {
        // Chat exists, use its ID
        chatId = chatData.id;
        console.log("Existing chat found with ID:", chatId);
      } else {
        // No chat exists, create a new one
        console.log("No existing chat found, creating new chat...");

        // Determine sender and receiver based on current user
        const senderUserId = currentUserId;
        const receiverUserId = match.owner1_id === currentUserId ? match.owner2_id : match.owner1_id;

        const { data: newChatData, error: newChatError } = await supabase
          .from('chats')
          .insert([
            {
              match_id: matchId,
              sender_user1_id: senderUserId,
              reciever_user2_id: receiverUserId
            }
          ])
          .select('id')
          .single();

        if (newChatError) {
          console.error('Error creating new chat:', newChatError);
          throw newChatError;
        }

        chatId = newChatData.id;
        console.log("New chat created with ID:", chatId);
      }

      // Navigate to the chatroom with the chat ID
      navigate(`/chatroom/${chatId}`);

    } catch (error) {
      console.error('Error handling match click:', error);
      // Optionally set an error state to display in the UI
      setError("Could not open or create chat.");
    }
  };

  return (
    <div className="grindgrr-container">
      <div className="app-header">
        <h1>Your Chats</h1>
      </div>
      <div className="chat-body">
        {loading ? (
          <p>Loading chats...</p>
        ) : error ? (
          <div className="error-message">
            <p>Error: {error}</p>
          </div>
        ) : matches.length === 0 ? (
          <div>
            <p>No active matches found</p>
            <p className="no-matches-message-small">
              {matches === null ? 'Error loading matches' : 'You have no active matches'}
            </p>
          </div>
        ) : (
          <ul className="chat-list">
            {matches.map((match) => (
              <li
                key={match.id}
                className="chat-list-item"
                onClick={() => handleMatchClick(match.id)}
              >
                <div className="chat-list-item-content">
                  {/* Determine which dog profile to display (the other dog) */}
                  {
                    (() => {
                      const otherDog = match.owner1_id === currentUserId ? match.dog2 : match.dog1;
                      return (
                        <>
                          {otherDog?.photo ? (
                            <img
                              src={otherDog.photo}
                              alt="Dog profile"
                              className="chat-list-item-image"
                            />
                          ) : (
                            <Dog size={50} className="chat-list-item-icon" />
                          )}
                          <div className="chat-list-item-details">
                            <h3>{otherDog?.name || 'Unknown Dog'}</h3>
                            <p>Matched on {new Date(match.created_at).toLocaleDateString()}</p>
                          </div>
                        </>
                      );
                    })()
                  }
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="nav-bar" style={{ justifyContent: "space-between" }}>
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

export default ChatList; 