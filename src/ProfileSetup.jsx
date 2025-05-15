import React, { useState, useEffect } from "react";
import {
  Avatar,
  Button,
  IconButton,
  TextField,
  Tabs,
  Tab,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Snackbar,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
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

  // Load existing profiles from Supabase on mount
  useEffect(() => {
    async function loadProfiles() {
      if (!user) return;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();
      if (profileData?.username) setName(profileData.username);
      if (profileData?.avatar_url) setUserPhoto(profileData.avatar_url);

      const { data: dogData } = await supabase
        .from("dog_profiles")
        .select("*")
        .eq("owner_id", user.id);
      if (dogData && dogData.length > 0) setDogs(dogData);
    }
    loadProfiles();
    // eslint-disable-next-line
  }, [user]);

  // Update dog field helper
  const updateDog = (field, value) => {
    setDogs((prev) =>
      prev.map((dog, idx) =>
        idx === activeDog ? { ...dog, [field]: value } : dog
      )
    );
  };

  // Upload photo helper 
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

  // Handle user photo upload
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

  // Handle dog photo upload
  const handleDogPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadPhoto(file, "dogs");
    if (url) updateDog("photo", url);
  };

  // Add new dog profile
  const addDogProfile = () => {
    setDogs((prev) => [...prev, { ...defaultDog }]);
    setActiveDog(dogs.length);
  };

  // Delete current dog profile
  const deleteDogProfile = async () => {
    if (dogs[activeDog]?.id) {
      await supabase
        .from("dog_profiles")
        .delete()
        .eq("id", dogs[activeDog].id);
    }
    setDogs((prev) => prev.filter((_, i) => i !== activeDog));
    setActiveDog(0);
    setShowDeleteDialog(false);
  };

  // Save all changes (user profile + dog profiles)
  const handleSave = async () => {
    setSaving(true);

    // Update user profile table
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, username: name, email, avatar_url: userPhoto }, { onConflict: "id" });

    // Update Supabase Auth user metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: name, avatar_url: userPhoto },
    });

    // Upsert dog profiles
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
  };

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", p: 2 }}>
      {/* Header with Back Arrow */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <IconButton onClick={onBack}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, textAlign: "center", fontWeight: 600, fontSize: "1.2rem" }}>
          Profile Setup / Editing
        </Box>
        {/* User profile photo upload (top right) */}
        <input
          accept="image/*"
          style={{ display: "none" }}
          id="user-photo-upload"
          type="file"
          onChange={handleUserPhotoChange}
        />
        <label htmlFor="user-photo-upload">
          <IconButton component="span">
            <Avatar
              src={userPhoto}
              sx={{ width: 48, height: 48 }}
            />
          </IconButton>
        </label>
      </Box>

      {/* User Info */}
      <TextField
        fullWidth
        label="Your Name"
        margin="normal"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        fullWidth
        label="Email"
        margin="normal"
        value={email}
        disabled
      />

      {/* Dog Profile Tabs */}
      <Tabs
        value={activeDog}
        onChange={(_, idx) => setActiveDog(idx)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        {dogs.map((dog, idx) => (
          <Tab key={dog.id || idx} label={dog.name || `Dog ${idx + 1}`} />
        ))}
        <IconButton onClick={addDogProfile} color="primary" aria-label="Add Dog">
          <AddCircleOutlineIcon />
        </IconButton>
      </Tabs>

      {/* Dog Profile Editing */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        {/* Dog photo upload */}
        <input
          accept="image/*"
          style={{ display: "none" }}
          id="dog-photo-upload"
          type="file"
          onChange={handleDogPhotoChange}
        />
        <label htmlFor="dog-photo-upload">
          <IconButton component="span">
            <Avatar
              src={dogs[activeDog]?.photo}
              sx={{ width: 64, height: 64, mr: 2 }}
            >
              <AddAPhotoIcon />
            </Avatar>
          </IconButton>
        </label>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setShowDeleteDialog(true)}
          disabled={dogs.length === 1}
        >
          Delete Dog Profile
        </Button>
      </Box>

      <TextField
        fullWidth
        label="Dog Name"
        margin="normal"
        value={dogs[activeDog]?.name || ""}
        onChange={(e) => updateDog("name", e.target.value)}
      />
      <TextField
        fullWidth
        label="Breed"
        margin="normal"
        value={dogs[activeDog]?.breed || ""}
        onChange={(e) => updateDog("breed", e.target.value)}
      />

      {/* Dog Size Radio Buttons */}
      <RadioGroup
        row
        value={dogs[activeDog]?.size || "medium"}
        onChange={(e) => updateDog("size", e.target.value)}
        sx={{ mb: 2 }}
      >
        <FormControlLabel value="small" control={<Radio />} label="Small" />
        <FormControlLabel value="medium" control={<Radio />} label="Medium" />
        <FormControlLabel value="large" control={<Radio />} label="Large" />
      </RadioGroup>

      {/* Age Input */}
      <TextField
        fullWidth
        label="Age (years)"
        type="number"
        nputProps={{ min: 0, max: 30 }}
        margin="normal"
        value={dogs[activeDog]?.age || ""}
        onChange={(e) => updateDog("age", e.target.value.replace(/\D/, ""))}
        />


      {/* Energy Level Slider */}
      <Box sx={{ my: 2 }}>
        <Box sx={{ mb: 1 }}>Energy Level</Box>
        <Slider
          value={dogs[activeDog]?.energy || 5}
          onChange={(_, val) => updateDog("energy", val)}
          min={1}
          max={10}
          step={1}
          marks={[
            { value: 1, label: "Low" },
            { value: 10, label: "High" },
          ]}
        />
      </Box>

      {/* Save Changes Button */}
      <Button
        fullWidth
        variant="contained"
        color="primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Changes"}
      </Button>

      {/* Deletion Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Dog Profile?</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this dog profile? This cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button color="error" onClick={deleteDogProfile}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        message="Profile updated successfully!"
      />
    </Box>
  );
}
