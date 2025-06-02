import { supabase } from "../supabaseClient";

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

async function checkMatch(swiperID, swipedID) {
    const [like1, like2] = await Promise.all([
        checkLike(swiperID, swipedID),
        checkLike(swipedID, swiperID)
    ]);

    return like1 && like2;
}

async function getOwner(dogId) {
    const { data, error } = await supabase
        .from('dog_profiles')
        .select('owner_id')
        .eq('id', dogId)
        .single();

    if (error) {
        console.error("getOwner:", error);
        return null;
    }
    return data ? data.owner_id : null;
}

async function createMatch(swiperID, swipedID, owner1ID, owner2ID) {
    console.log(`creating match between ${swiperID} and ${swipedID}`);
    const { data, error } = await supabase
        .from('matches')
        .insert([
            {
                dog1_id: swiperID,
                dog2_id: swipedID,
                owner1_id: owner1ID,
                owner2_id: owner2ID,
                dog_ids: [swiperID, swipedID],
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