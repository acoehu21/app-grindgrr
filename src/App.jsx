import { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";
import { supabase } from "../supabaseClient";
import ProfileSetup from "./ProfileSetup"; 

const dogImageUrl = "https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?auto=format&fit=crop&w=400&q=80";

function Home({ session, signUp, signOut, createProfile }) {
  const navigate = useNavigate();

  const handleCreateProfile = async () => {
    await createProfile();
    navigate("/profile-setup");
  };

  return (
    <div className="grindgrr-container">
      <div className="app-header">
        <h1><span className="dog-icon">🐶</span>GrindGrr</h1>
        <p>Love at first sniff</p>
      </div>
      <div className="center-content">
        <img src={dogImageUrl} alt="Cute dog" className="dog-photo" />
        {!session ? (
          <button className="google-signin-btn" onClick={signUp}>
            <span className="dog-icon">🐕</span> Sign in with Google
          </button>
        ) : (
          <div className="welcome-container">
            <h2><span className="dog-icon">🐩</span> Welcome, {session?.user?.email?.split('@')[0]}</h2>
            <button className="createprofile-btn" onClick={handleCreateProfile}>Create Profile</button>
            <button className="signout-btn" onClick={signOut}>Sign out</button>
          </div>
        )}
      </div>
    </div>
  );
}

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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signUp = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

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
    <Router>
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
          <ProfileSetup
            user={session?.user}
            onBack={() => window.history.back()}
          />
        } />
      </Routes>
    </Router>
  );
}

export default App;


