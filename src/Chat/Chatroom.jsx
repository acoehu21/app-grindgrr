import React from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import BackButton from "./Images/BackButton.png";
import DogEmoji from "./Images/DogEmoji.png";
import ProfileEmoji from "./Images/ProfileEmoji.png";
import ChatEmoji from "./Images/ChatEmoji-Curr.png";
import SendButton from "./Images/SendButton.png";

const Chatroom = () => {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate("/chats");
    };

    const handleSend = (e) => {
        e.preventDefault();
    };

    return (
        <div className="grindgrr-container">
            <div className="chat-header">
                <button className="back-button" onClick = {handleBack}>
                    <img src={BackButton} alt="Send" className="back-button" />
                </button>
            </div>
            <div className = "chat-body">

            </div>
            <div className="chat-footer">
                <div className="input-row">
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="Type your message here..."
                    />
                    <button className="send-button">
                        <img src={SendButton} alt="Send" className="send-icon" />
                    </button>
                </div>
                <div className="emoji-row">
                    <img src={DogEmoji} alt="Dog" className="dog-emoji" />
                    <img src={ChatEmoji} alt="Chat" className="chat-emoji" />
                    <img src={ProfileEmoji} alt="Profile" className="profile-emoji" />
                </div>
            </div>
        </div>
    );
};

export default Chatroom;