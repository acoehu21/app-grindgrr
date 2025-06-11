import { supabase } from "../supabaseClient";

/**
 * Records a swipe action in the database.
 * @param {string} swiperID - The ID of the dog performing the swipe.
 * @param {string} swipedID - The ID of the dog being swiped on.
 * @param {'like'|'pass'} action - The swipe action ('like' or 'pass').
 * @returns {Promise<Object|null>} The swipe record data, or null on error.
 */
async function recordSwipe(swiperID, swipedID, action) {
    const { data, error } = await supabase
        .from('swipes')
        .insert([
            {
                swiper_dog_id: swiperID,
                swiped_dog_id: swipedID,
                action: action,
            },
        ])
        .select('id, swiper_dog_id, swiped_dog_id, action')
        .single();
    if (error) {
        console.error("recordSwipe:", error);
        return null;
    }
    return data;
}

/**
 * Checks if a 'like' exists between two dogs.
 * @param {string} swiperID - The ID of the first dog.
 * @param {string} swipedID - The ID of the second dog.
 * @returns {Promise<boolean>} True if a like exists, false otherwise.
 */
async function checkLike(swiperID, swipedID) {
    const { data, error } = await supabase
        .from('swipes')
        .select('id')
        .eq('swiper_dog_id', swiperID)
        .eq('swiped_dog_id', swipedID)
        .eq('action', 'like')
        .limit(1);

    if (error) {
        console.error("checkLike:", error);
        return false;
    }
    return data && data.length > 0;
}

/**
 * Checks if a mutual match exists between two dogs.
 * @param {string} swiperID - The ID of the first dog.
 * @param {string} swipedID - The ID of the second dog.
 * @returns {Promise<boolean>} True if a match exists, false otherwise.
 */
async function checkMatch(swiperID, swipedID) {
    const [like1, like2] = await Promise.all([
        checkLike(swiperID, swipedID),
        checkLike(swipedID, swiperID)
    ]);

    return like1 && like2;
}

/**
 * Gets the owner ID for a given dog.
 * @param {string} dogID - The ID of the dog.
 * @returns {Promise<string|null>} The owner ID, or null if not found.
 */
async function getOwner(dogID) {
    const { data, error } = await supabase
        .from('dog_profiles')
        .select('owner_id')
        .eq('id', dogID)
        .single();

    if (error) {
        console.error("getOwner:", error);
        return null;
    }
    return data ? data.owner_id : null;
}

/**
 * Creates a match record in the database.
 * @param {string} dog1ID - The ID of the first dog.
 * @param {string} dog2ID - The ID of the second dog.
 * @param {string} owner1ID - The owner ID of the first dog.
 * @param {string} owner2ID - The owner ID of the second dog.
 * @returns {Promise<Object|null>} The match record data, or null on error.
 */
async function createMatch(dog1ID, dog2ID, owner1ID, owner2ID) {
    console.log(`creating match between ${dog1ID} and ${dog2ID}`);
    const { data, error } = await supabase
        .from('matches')
        .insert([
            {
                dog1_id: dog1ID,
                dog2_id: dog2ID,
                owner1_id: owner1ID,
                owner2_id: owner2ID,
                dog_ids: [dog1ID, dog2ID],
                owner_ids: [owner1ID, owner2ID],
                status: 'active',
            },
        ])
        .select()
        .single();

    if (error) {
        console.error("createMatch:", error);
        return null;
    }
    return data;
}

/**
 * Handles the swiping logic, including recording the swipe, checking for matches, and creating match records.
 * @param {string} swiperID - The ID of the dog performing the swipe.
 * @param {string} swipedID - The ID of the dog being swiped on.
 * @param {'like'|'pass'} action - The swipe action ('like' or 'pass').
 * @returns {Promise<Object>} An object containing swipe, match, and message information.
 */
export default async function handleSwiping(swiperID, swipedID, action) {
    const saveSwipe = await recordSwipe(swiperID, swipedID, action);

    if (!saveSwipe) {
        return { swipe: null, match: null, message: "Failed to record swipe." };
    }

    if (action === 'like') {
        const match = await checkMatch(swiperID, swipedID);

        if (match) {
            const owner1ID = await getOwner(swiperID);
            const owner2ID = await getOwner(swipedID);

            if (owner1ID && owner2ID) {
                const savedMatch = await createMatch(swiperID, swipedID, owner1ID, owner2ID);
                // sucessful match
                if (savedMatch) {
                    return { swipe: saveSwipe, match: savedMatch, message: "It's a match!" };
                } else {
                    // error creating match in database
                    return { swipe: saveSwipe, match: null, message: "Failed to create match record." };
                }
            } else {
                return { swipe: saveSwipe, match: null, message: "Failed to retrieve owner info for match creation." };
            }
        } else {
            // like, no match
            return { swipe: saveSwipe, match: null, message: "Profile liked." };
        }
    } else {
        // passed
        return { swipe: saveSwipe, match: null, message: "Profile passed." };
    }
}