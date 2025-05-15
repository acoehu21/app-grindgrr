import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "../supabaseClient";

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

  return (
    <div className="grindgrr-container">
      <div className="app-header">
        <h1><span className="dog-icon">🐶</span>Grindgrr</h1>
        <p>Love at first sniff – Dog play date app</p>
      </div>
      {!session ? (
        <button className="google-signin-btn" onClick={signUp}>
          <span className="dog-icon">🐕</span> Sign in with Google
        </button>
      ) : (
        <div className="welcome-container">
          <h2><span className="dog-icon">🐩</span> Welcome, {session?.user?.email}</h2>
          <button className="signout-btn" onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  );
}

export default App;
