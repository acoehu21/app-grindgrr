import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import handleSwiping from './SwipingLogic';
import { useNavigate } from 'react-router-dom';
import { UserRoundPen, Dog, MessageCircle, Heart, X } from 'lucide-react';

// TODO: - switching between active dog profile
//       - edge cases
//          - dog profile is deleted post-swipe & match
//       - randomize order of dog profiles
//       - improve styling & animations
//          - status messages (match found, no profile, loading profile, etc.)
//          - swiping

const PLACEHOLDER = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/No-Image-Placeholder.svg/1200px-No-Image-Placeholder.svg.png'
const STATUS_DELAY = 500;
const MATCH_DELAY = 2000;

/**
 * Swipe component for browsing and swiping on dog profiles.
 * @param {Object} props - Component props.
 * @param {Object} props.session - The current user session.
 * @returns {JSX.Element} The rendered Swipe component.
 */
function Swipe({ session }) {
    const [userDog, setUserDog] = useState(null);
    const [matchDog, setMatchDog] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState("");
    const [fetchProfile, setFetchProfile] = useState(0);
    const navigate = useNavigate();
    const userID = session?.user?.id;

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

    useEffect(() => {
        if (userID) {
            setStatus("Loading profile...");
            setIsLoading(true);
            /**
             * Fetches the user's dog profile and updates state.
             * @returns {Promise<void>}
             */
            const fetchUserDog = async () => {
                const { data, error } = await supabase
                    .from('dog_profiles')
                    .select('id')
                    .eq('owner_id', userID)
                    .limit(1)
                    .maybeSingle();

                if (error) {
                    setStatus("Error loading profile.");
                    setUserDog(null);
                    setIsLoading(false);
                } else if (data) {
                    setUserDog(data.id);
                } else {
                    setStatus("No dog profile detected.\nPlease create one before swiping.");
                    setUserDog(null);
                    setIsLoading(false);
                }
            };
            fetchUserDog();
        } else {
            // should reroute before it gets to this point
            setUserDog(null);
            setStatus("Please sign in to start swiping.");
            setIsLoading(false);
        }
    }, [userID]);

    /**
     * Fetches the next dog profile to swipe on, excluding already swiped dogs.
     * @returns {Promise<void>}
     */
    const fetchDogProfiles = async () => {
        if (!userDog) {
            if (userID && isLoading) setIsLoading(false);
            return;
        }

        setStatus("Loading profile...");
        setIsLoading(true);

        // previous dogs
        let swipedDogs = [];
        const { data: previousSwipes, error: error } = await supabase
            .from('swipes')
            .select('swiped_dog_id')
            .eq('swiper_dog_id', userDog);

        if (error) {
            console.error("fetchDogProfiles - previousSwipes:", error);
        } else if (previousSwipes) {
            swipedDogs = previousSwipes.map(s => s.swiped_dog_id);
        }

        // next dog
        let q = supabase
            .from('dog_profiles')
            .select('*')
            .neq('owner_id', userID);

        if (swipedDogs.length > 0) {
            q = q.not('id', 'in', `(${swipedDogs.join(',')})`);
        }
        q = q.order('id', { ascending: true });
        q = q.limit(1).maybeSingle();
        const { data, error2 } = await q;

        if (error2) {
            console.error("fetchDogProfiles - query:", error2);
            setMatchDog(null);
        } else if (data) {
            setMatchDog(data);
            setStatus("");
        } else {
            setMatchDog(null);
            setStatus("We can no longer find dogs near you. Please try again later!");
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (userDog) {
            fetchDogProfiles();
        } else if (userID && !userDog) {
            if (isLoading) setIsLoading(false);
        }
    }, [userDog, fetchProfile, userID]);

    /**
     * Handles a swipe action (like or pass) on a dog profile.
     * @param {'like'|'pass'} action - The swipe action to perform.
     * @returns {Promise<void>}
     */
    const onSwipe = async (action) => {
        if (!userDog || !matchDog) {
            return;
        }

        setStatus("Processing swipe...");
        setIsLoading(true);

        const result = await handleSwiping(userDog, matchDog.id, action);
        setStatus(result.message);

        // delay before next fetching next profile
        const delay = result.match ? MATCH_DELAY : STATUS_DELAY;
        setTimeout(() => {
            setFetchProfile(prev => prev + 1);
        }, delay);
    };

    // rendering ---------------------------------------------------------------

    if (isLoading) {
        return (
            <div className="grindgrr-container">
                <div>{status}</div>
            </div>
        );
    }

    // no dog profile
    if (!userDog && userID) {
        return (
            <div className="grindgrr-container">
                <div>{status}</div>
            </div>
        );
    }

    return (
        <div className="grindgrr-container" style={{ overflow: 'hidden' }}>
            <div className="center-content">
                {!matchDog ? (
                    <div className="no-matches-container">
                        <h2 className="no-matches-title">Oops!</h2>
                        <p className="no-matches-message">
                            We can no longer find dogs near you.<br />Please try again later!
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="card">
                            <img
                                src={matchDog.photo || PLACEHOLDER}
                                alt={`${matchDog.name} the ${matchDog.breed}`}
                                className="card-photo"
                            />
                            <div className="card-bio">
                                <h2 className="dog-name">{matchDog.name}, {matchDog.age}</h2>
                                <div className="dog-info">
                                    <p className="dog-info-item">{matchDog.breed}</p>
                                    <p className="dog-info-item">{matchDog.size}</p>
                                    <p className="dog-info-item">Activity: {matchDog.energy} / 10</p>
                                </div>
                            </div>
                        </div>
                        <div className="swipe-btn-container">
                            <button
                                onClick={() => onSwipe('pass')}
                                disabled={isLoading}
                                className="swipe-btn pass-btn"
                            >
                                <X size={28} />
                            </button>
                            <button
                                onClick={() => onSwipe('like')}
                                disabled={isLoading}
                                className="swipe-btn like-btn"
                            >
                                <Heart size={28} />
                            </button>
                        </div>
                    </>
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
}

export default Swipe;