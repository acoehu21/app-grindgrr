import { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";
import { supabase } from "../supabaseClient";
import ProfileSetup from "./ProfileSetup";
import Swipe from "./Swipe";
import ChatList from "./Chat/ChatList";
import Chatroom from "./Chat/Chatroom";
import { UserRoundPen, Dog, MessageCircle } from 'lucide-react';

const dogImageUrl = "https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?auto=format&fit=crop&w=400&q=80";

/**
 * Home component for displaying the landing page and navigation.
 * @param {Object} props - Component props.
 * @param {Object} props.session - The current user session.
 * @param {Function} props.signUp - Function to trigger Google sign-in.
 * @param {Function} props.signOut - Function to sign out the user.
 * @param {Function} props.createProfile - Function to create a user profile.
 * @returns {JSX.Element} The rendered Home component.
 */
function Home({ session, signUp, signOut, createProfile }) {
  const navigate = useNavigate();

  /**
   * Navigates to the profile setup page after creating a profile.
   * @returns {Promise<void>}
   */
  const handleCreateProfile = async () => {
    await createProfile();
    navigate("/profile-setup");
  };

  /**
   * Navigates to the swipe page.
   * @returns {void}
   */
  const handleStartSwiping = () => {
    navigate("/swipe");
  }

  /**
   * Navigates to the chat list page.
   * @returns {void}
   */
  const handleChat = () => {
    navigate("/chat");
  }

  return (
    <div className="grindgrr-container">
      <div className="app-header">
        <h1><span className="dog-icon">🐶</span>GrindGrr</h1>
        <p>Love at first sniff</p>
      </div>
      <div className="center-content">
        <img src={dogImageUrl} alt="Cute dog" className="dog-photo" />
        {!session ? (
          <button className="google-signin-btn" onClick={signUp} style={{ marginTop: '3rem' }}>
            <span className="dog-icon">🐕</span> Sign in with Google
          </button>
        ) : (
          <div className="welcome-container">
            <h2><span className="dog-icon">🐩</span> Welcome, {session?.user?.email?.split('@')[0]}</h2>
            <div className="nav-container">
              <button className="nav-btn" onClick={handleCreateProfile}>
                <UserRoundPen size={48} />
              </button>
              <button className="nav-btn" onClick={handleStartSwiping}>
                <Dog size={48} />
              </button>
              <button className="nav-btn" onClick={handleChat}>
                <MessageCircle size={48} />
              </button>
            </div>
            <button className="nav-btn" onClick={signOut}>Sign out</button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main App component that handles routing and session management.
 * @returns {JSX.Element} The rendered App component with routes.
 */
function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Signs out the current user.
   * @returns {Promise<void>}
   */
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  /**
   * Initiates Google OAuth sign-in.
   * @returns {Promise<void>}
   */
  const signUp = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  /**
   * Creates a user profile in the Supabase database.
   * @returns {Promise<void>}
   */
  const createProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .upsert([
        {
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata.full_name,
        },
      ]);

    if (error) {
      console.error("Error creating profile:", error);
    } else {
      console.log("Profile created:", data);
    }
  };

  return (
    <Routes>
      <Route path="/" element={
        <Home
          session={session}
          signUp={signUp}
          signOut={signOut}
          createProfile={createProfile}
        />
      } />
      <Route path="/profile-setup" element={
        session ?
          <ProfileSetup
            user={session?.user}
            onBack={() => window.history.back()}
          /> :
          <Home signUp={signUp} />
      } />
      <Route path="/swipe" element={
        session ?
          <Swipe
            session={session}
          /> :
          <Home signUp={signUp} />
      } />
      <Route path="/chat" element={
        session ?
          <ChatList /> :
          <Home signUp={signUp} />
      } />
      <Route path="/chatroom/:chatId" element={
        session ?
          <Chatroom /> :
          <Home signUp={signUp} />
      } />
    </Routes>
  );
}

export default App;


