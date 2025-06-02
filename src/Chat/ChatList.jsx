import React from "react";
import "../App.css";
import DogEmoji from "./Images/DogEmoji.png";
import ProfileEmoji from "./Images/ProfileEmoji.png";
import ChatEmoji from "./Images/ChatEmoji-Curr.png";



const ChatList = () => {
  return (
    <div className="grindgrr-container">
      <div className="app-header">
        <h1>Your Chats</h1>
      </div>
      <div className = "chat-body">

      </div>
      <div className="emoji-row">
          <img src={DogEmoji} alt="Dog" className="dog-emoji" />
          <img src={ChatEmoji} alt="Chat" className="chat-emoji" />
          <img src={ProfileEmoji} alt="Profile" className="profile-emoji" />
      </div>
    </div>
  );
};

export default ChatList; 