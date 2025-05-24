import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const defaultDog = {
  name: "",
  breed: "",
  size: "medium",
  age: "",
  energy: 5,
  photo: "",
};

export default function ProfileSetup({ user, onBack }) {
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [email] = useState(user?.email || "");
  const [userPhoto, setUserPhoto] = useState(user?.user_metadata?.avatar_url || "");
  const [dogs, setDogs] = useState([{ ...defaultDog }]);
  const [activeDog, setActiveDog] = useState(0);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    async function loadProfiles() {
      if (!user) return;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();
      if (profileData?.username) setName(profileData.username);
      if (profileData?.avatar_url) {
        setUserPhoto(profileData.avatar_url);
      }
      

      const { data: dogData } = await supabase
        .from("dog_profiles")
        .select("*")
        .eq("owner_id", user.id);
      if (dogData && dogData.length > 0) setDogs(dogData);
    }
    loadProfiles();
  }, [user]);

  const updateDog = (field, value) => {
    setDogs((prev) =>
      prev.map((dog, idx) =>
        idx === activeDog ? { ...dog, [field]: value } : dog
      )
    );
  };

  const uploadPhoto = async (file, folder) => {
    if (!file) return "";
    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}/${user.id}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("profile-photos")
      .upload(fileName, file, { upsert: true });
    if (error) {
      alert("Failed to upload photo: " + error.message);
      return "";
    }
    const { data } = supabase.storage.from("profile-photos").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleUserPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadPhoto(file, "users");
    if (url) {
      setUserPhoto(url);
      await supabase.auth.updateUser({
        data: { avatar_url: url },
      });
      await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
    }
  };

  const handleDogPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadPhoto(file, "dogs");
    if (url) updateDog("photo", url);
  };

  const addDogProfile = () => {
    setDogs((prev) => [...prev, { ...defaultDog }]);
    setActiveDog(dogs.length);
  };

  const deleteDogProfile = async () => {
    if (dogs[activeDog]?.id) {
      await supabase
        .from("dog_profiles")
        .delete()
        .eq("id", dogs[activeDog].id);
    }
    setDogs((prev) => {
      const newDogs = prev.filter((_, i) => i !== activeDog);
      setActiveDog(Math.max(0, activeDog - 1));
      return newDogs;
    });
    setShowDeleteDialog(false);
  };

  const handleSave = async () => {
    setSaving(true);

    await supabase
      .from("profiles")
      .upsert({ id: user.id, username: name, email, avatar_url: userPhoto }, { onConflict: "id" });

    await supabase.auth.updateUser({
      data: { full_name: name, avatar_url: userPhoto },
    });

    for (const dog of dogs) {
      if (!dog.name || !dog.breed || !dog.size) {
        alert("Please fill out all required dog fields.");
        setSaving(false);
        return;
      }
      const dogData = {
        id: dog.id,
        owner_id: user.id,
        name: dog.name,
        breed: dog.breed,
        size: dog.size,
        age: dog.age,
        energy: dog.energy,
        photo: dog.photo,
      };
      const { error } = await supabase
        .from("dog_profiles")
        .upsert(dogData, { onConflict: "id" });
      if (error) {
        alert("Error saving dog profiles: " + error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <div className="grindgrr-container" style={{ overflowY: "auto" }}>
      {/* Header: Back | Profile Setup | Avatar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: "1.5rem"
      }}>
        <button className="signout-btn" style={{ margin: 0, padding: "0.6rem 1.5rem" }} onClick={onBack}>
          ← Back
        </button>
        <div style={{
          flex: 1,
          textAlign: "center",
          fontWeight: 700,
          fontSize: "1.5rem",
          color: "#ff2d55",
          fontFamily: "'Montserrat', Arial, sans-serif",
          letterSpacing: 1,
          whiteSpace: "nowrap"
        }}>
          Profile Setup
        </div>
        <label htmlFor="user-photo-upload" style={{ cursor: "pointer" }}>
          <input
            accept="image/*"
            id="user-photo-upload"
            type="file"
            style={{ display: "none" }}
            onChange={handleUserPhotoChange}
          />
          <img
            src={userPhoto || "https://ui-avatars.com/api/?name=User"}
            alt="User avatar"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "2px solid #ff2d55",
              objectFit: "cover",
              display: "block"
            }}
          />
        </label>
      </div>

      {/* User Info */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem" }}>
        <img
          src={userPhoto || "https://ui-avatars.com/api/?name=User"}
          alt="User avatar"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "2px solid #ff2d55",
            objectFit: "cover",
            display: "block",
            marginRight: "1rem"
          }}
        />
        <div>
          <div style={{ fontWeight: 700, color: "#ff2d55", fontSize: "1.1rem", marginBottom: 2 }}>{name}</div>
          <div style={{ color: "#424242", fontSize: "1rem", wordBreak: "break-all" }}>{email}</div>
        </div>
      </div>

      {/* User Name Edit */}
      <label style={{ color: "#ff2d55", fontWeight: 600, display: "block", textAlign: "left", marginLeft: 24 }}>Your Name</label>
      <input
        className="profile-input"
        style={{ width: "95%", fontSize: "1.1rem", borderRadius: "12px", border: "1.5px solid #fd5564", padding: "0.7rem", marginBottom: "1rem", marginLeft: 24 }}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* Dog Tabs */}
      <div style={{ display: "flex", alignItems: "center", width: "100%", marginBottom: "1rem" }}>
        <div style={{ flex: 1, display: "flex", gap: "0.5rem", overflowX: "auto" }}>
          {dogs.map((dog, idx) => (
            <button
              key={dog.id || idx}
              className="google-signin-btn"
              style={{
                background: idx === activeDog ? "linear-gradient(90deg, #ff2d55 60%, #ff6fa3 100%)" : "#fff",
                color: idx === activeDog ? "#fff" : "#ff2d55",
                border: idx === activeDog ? "none" : "2px solid #ff2d55",
                fontSize: "1rem",
                padding: "0.6rem 1.1rem",
                minWidth: 90,
              }}
              onClick={() => setActiveDog(idx)}
            >
              {dog.name || `Dog ${idx + 1}`}
            </button>
          ))}
        </div>
        <button
          className="google-signin-btn"
          style={{ marginLeft: "0.5rem", padding: "0.6rem 1.1rem" }}
          onClick={addDogProfile}
        >
          +
        </button>
      </div>

      {/* Dog Profile Editing */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
        <label htmlFor="dog-photo-upload" style={{ cursor: "pointer" }}>
          <input
            accept="image/*"
            id="dog-photo-upload"
            type="file"
            style={{ display: "none" }}
            onChange={handleDogPhotoChange}
          />
          <img
            src={dogs[activeDog]?.photo || "https://ui-avatars.com/api/?name=Dog"}
            alt="Dog avatar"
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              objectFit: "cover",
              display: "block",
              marginRight: "1rem",
              border: "2px solid #fd5564",
              background: "#fff"
            }}
          />
        </label>
        <button
          className="signout-btn"
          style={{ padding: "0.6rem 1.5rem" }}
          onClick={() => setShowDeleteDialog(true)}
          disabled={dogs.length === 1}
        >
          Delete Dog
        </button>
      </div>

      {/* Dog Name */}
      <label style={{ color: "#ff2d55", fontWeight: 600, display: "block", textAlign: "left", marginLeft: -300 }}>Dog Name</label>
      <input
        className="profile-input"
        style={{ width: "95%", fontSize: "1.1rem", borderRadius: "12px", border: "1.5px solid #fd5564", padding: "0.7rem", marginBottom: "1rem", marginLeft: 24 }}
        type="text"
        value={dogs[activeDog]?.name || ""}
        onChange={(e) => updateDog("name", e.target.value)}
      />

      {/* Breed */}
      <label style={{color: "#ff2d55", fontWeight: 600, display: "block", textAlign: "left", marginLeft: -340 }}>Breed</label>
      <input
        className="profile-input"
        style={{ width: "95%", fontSize: "1.1rem", borderRadius: "12px", border: "1.5px solid #fd5564", padding: "0.7rem", marginBottom: "1rem", marginLeft: 24 }}
        type="text"
        value={dogs[activeDog]?.breed || ""}
        onChange={(e) => updateDog("breed", e.target.value)}
      />

      {/* Size */}
      <div style={{ margin: "1rem 0", width: "100%", textAlign: "left", marginLeft: 24 }}>
        <span style={{ fontWeight: 600, color: "#ff2d55" }}>Size:</span>
        <label style={{ marginLeft: 16, color: "#ff2d55" }}>
          <input
            type="radio"
            name="dog-size"
            value="small"
            checked={dogs[activeDog]?.size === "small"}
            onChange={() => updateDog("size", "small")}
          /> Small
        </label>
        <label style={{ marginLeft: 16, color: "#ff2d55" }}>
          <input
            type="radio"
            name="dog-size"
            value="medium"
            checked={dogs[activeDog]?.size === "medium"}
            onChange={() => updateDog("size", "medium")}
          /> Medium
        </label>
        <label style={{ marginLeft: 16, color: "#ff2d55"}}>
          <input
            type="radio"
            name="dog-size"
            value="large"
            checked={dogs[activeDog]?.size === "large"}
            onChange={() => updateDog("size", "large")}
          /> Large
        </label>
      </div>

      {/* Age */}
      <label style={{ color: "#d6336c", fontWeight: 600, display: "block", textAlign: "left", marginLeft: 24 }}>Age (years)</label>
      <input
        className="profile-input"
        style={{ width: "95%", fontSize: "1.1rem", borderRadius: "12px", border: "1.5px solid #fd5564", padding: "0.7rem", marginBottom: "1rem", marginLeft: 24 }}
        type="number"
        min={0}
        max={30}
        value={dogs[activeDog]?.age || ""}
        onChange={(e) => updateDog("age", e.target.value.replace(/\D/, ""))}
      />

      {/* Energy Level */}
      <div style={{ margin: "1.2rem 0", width: "100%", marginLeft: 24 }}>
        <label style={{ fontWeight: 600, color: "#ef4a75", display: "block", textAlign: "left" }}>Energy Level</label>
        <input
          type="range"
          min={1}
          max={10}
          value={dogs[activeDog]?.energy || 5}
          onChange={(e) => updateDog("energy", Number(e.target.value))}
          style={{ width: "95%" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", color: "#888", width: "95%" }}>
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {/* Save Button */}
      <button
        className="google-signin-btn createprofile-btn"
        style={{ width: "100%", margin: "1.5rem 0" }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff", padding: "2rem", borderRadius: "20px", minWidth: "320px", textAlign: "center", border: "2px solid #ff2d55"
          }}>
            <h2 style={{ color: "#ff2d55" }}>Delete Dog Profile?</h2>
            <p>Are you sure you want to delete this dog profile? This cannot be undone.</p>
            <div style={{ marginTop: "1.2rem", display: "flex", justifyContent: "center", gap: "1rem" }}>
              <button className="signout-btn" onClick={() => setShowDeleteDialog(false)}>Cancel</button>
              <button className="google-signin-btn" onClick={deleteDogProfile}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Snackbar */}
      {success && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#ff2d55",
          color: "#fff",
          borderRadius: "30px",
          padding: "1rem 2rem",
          fontWeight: 600,
          fontFamily: "'Montserrat', Arial, sans-serif",
          boxShadow: "0 3px 8px rgba(255,45,85,0.15)",
          zIndex: 1000
        }}>
          Profile updated successfully!
        </div>
      )}
    </div>
  );
}
