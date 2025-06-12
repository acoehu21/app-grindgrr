# GrindGrr - Dog Playdate App

GrindGrr is a Tinder-style app for dog owners to find playdates for their furry friends. This application allows users to create profiles for themselves and their dogs, swipe through potential playdate matches, and chat with other dog owners once matched.

## Features

- User authentication (Google OAuth)
- Profile creation for dog owners
- Multiple dog profiles per user
- Dog profile details including name, breed, age, size, energy level, and photos
- Swipe interface to find potential matches
- Chat messaging for users

## Technology Stack

- **Frontend**: React with styled-components
- **Backend**: Supabase (Authentication, Database, Storage)

## Prerequisites

Node.js v20+

## Table Creation (Supabase)
Create a Supabase Database and put the supabase URL (VITE_SUPABASE_URL) and ANON key (VITE_SUPABASE_ANON_KEY) into a .env file.

1. Create users table
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text,
    google_id text UNIQUE,
    display_name text,
    profile_image_url text,
    bio text,
    preferred_dog_age_range_min integer,
    preferred_dog_age_range_max integer,
    preferred_dog_sizes text[],
    preferred_energy_levels text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

2. Create profiles table
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text,
    email text,
    avatar_url text,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

3. Create dog_profiles table
CREATE TABLE public.dog_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_id uuid,
    name text NOT NULL,
    breed text NOT NULL,
    size text NOT NULL,
    energy integer,
    photo text,
    age integer,
    CONSTRAINT dog_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT dog_profiles_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);

4. Create dogs table
CREATE TABLE public.dogs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_id uuid,
    name text,
    breed text,
    age integer,
    size text CHECK (size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text])),
    energy_level text CHECK (energy_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
    temperament_tags text[],
    play_style_tags text[],
    bio text,
    vaccination_up_to_date boolean,
    is_active_profile boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    images text[],
    CONSTRAINT dogs_pkey PRIMARY KEY (id),
    CONSTRAINT dogs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);

5. Create dog_images table
CREATE TABLE public.dog_images (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    dog_id uuid,
    image_url text NOT NULL,
    alt_text text NOT NULL,
    CONSTRAINT dog_images_pkey PRIMARY KEY (id),
    CONSTRAINT dog_images_dog_id_fkey FOREIGN KEY (dog_id) REFERENCES public.dogs(id)
);

6. Create matches table
CREATE TABLE public.matches (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    dog1_id uuid,
    dog2_id uuid,
    owner1_id uuid,
    owner2_id uuid,
    status text CHECK (status = ANY (ARRAY['active'::text, 'unmatched_by_user1'::text, 'unmatched_by_user2'::text, 'blocked'::text])),
    created_at timestamp with time zone DEFAULT now(),
    dog_ids uuid[],
    owner_ids uuid[],
    CONSTRAINT matches_pkey PRIMARY KEY (id),
    CONSTRAINT matches_owner1_id_fkey FOREIGN KEY (owner1_id) REFERENCES public.profiles(id),
    CONSTRAINT matches_owner2_id_fkey FOREIGN KEY (owner2_id) REFERENCES public.profiles(id),
    CONSTRAINT matches_dog2_id_fkey FOREIGN KEY (dog2_id) REFERENCES public.dog_profiles(id),
    CONSTRAINT matches_dog1_id_fkey FOREIGN KEY (dog1_id) REFERENCES public.dog_profiles(id)
);

7. Create swipes table
CREATE TABLE public.swipes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    swiper_dog_id uuid,
    swiped_dog_id uuid,
    action text NOT NULL CHECK (action = ANY (ARRAY['like'::text, 'pass'::text])),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT swipes_pkey PRIMARY KEY (id),
    CONSTRAINT swipes_swiped_dog_id_fkey FOREIGN KEY (swiped_dog_id) REFERENCES public.dog_profiles(id),
    CONSTRAINT swipes_swiper_dog_id_fkey FOREIGN KEY (swiper_dog_id) REFERENCES public.dog_profiles(id)
);

8. Create chats table
CREATE TABLE public.chats (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    match_id uuid UNIQUE,
    sender_user1_id uuid,
    reciever_user2_id uuid,
    last_message_timestamp timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    content text,
    CONSTRAINT chats_pkey PRIMARY KEY (id),
    CONSTRAINT chats_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);

9. Create messages table
CREATE TABLE public.messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    chat_id uuid,
    sender_id uuid,
    content text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT messages_pkey PRIMARY KEY (id),
    CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
    CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);

Ensure that the messages table has realtime subscription.

## Installation

1. `npm install`
2. `npm run build`
3. `npm run preview`
4. Open localhost URL
