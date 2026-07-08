-- AgriScan AI - Production-ready Supabase Postgres Schema and RLS Migration File
-- This file configures the complete database structure for deployment to Supabase

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- 1. PUBLIC PROFILES TABLE (Linked to auth.users)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text not null,
    name text,
    avatar_url text,
    account_type text check (account_type in ('Gardener', 'Farmer', 'Nursery', 'Agribusiness')) default 'Gardener',
    location text,
    units text check (units in ('metric', 'imperial')) default 'metric',
    plan text check (plan in ('Free', 'Pro', 'Enterprise')) default 'Free',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. FARMS / FIELDS TABLE
create table public.farms (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    zone_count integer default 1,
    user_id uuid references public.profiles(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. PLANTS / CROPS TABLE
create table public.plants (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    type text not null,
    planting_date date not null,
    health_status text check (health_status in ('Healthy', 'Warning', 'Critical')) default 'Healthy',
    photo_url text,
    farm_id uuid references public.farms(id) on delete set null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. SCANS TABLE
create table public.scans (
    id uuid default uuid_generate_v4() primary key,
    plant_id uuid references public.plants(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    image_url text not null,
    diagnosis text not null,
    confidence numeric check (confidence >= 0 and confidence <= 100) not null,
    severity text check (severity in ('Low', 'Medium', 'High')) not null,
    symptoms text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. TREATMENTS TABLE
create table public.treatments (
    id uuid default uuid_generate_v4() primary key,
    scan_id uuid references public.scans(id) on delete cascade not null,
    plant_id uuid references public.plants(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    type text not null,
    organic_steps text[] not null,
    chemical_steps text[] not null,
    status text check (status in ('Pending', 'In Progress', 'Completed')) default 'Pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    resolved_at timestamp with time zone
);

-- 6. NOTES TABLE
create table public.notes (
    id uuid default uuid_generate_v4() primary key,
    plant_id uuid references public.plants(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. NOTIFICATIONS TABLE
create table public.notifications (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    message text not null,
    category text check (category in ('Scan', 'Treatment', 'Alert', 'Community', 'System')) not null,
    read boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. TEAM MEMBERS TABLE
create table public.team_members (
    id uuid default uuid_generate_v4() primary key,
    farm_id uuid references public.farms(id) on delete cascade not null,
    email text not null,
    role text check (role in ('Owner', 'Manager', 'Worker')) not null,
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. FORUM POSTS TABLE
create table public.forum_posts (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    content text not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    author_name text not null,
    category text check (category in ('General', 'Diseases', 'Tips', 'Farming Tech')) default 'General',
    likes uuid[] default array[]::uuid[] not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. FORUM COMMENTS TABLE
create table public.forum_comments (
    id uuid default uuid_generate_v4() primary key,
    post_id uuid references public.forum_posts(id) on delete cascade not null,
    content text not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    author_name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. EXPERT REVIEWS TABLE
create table public.expert_reviews (
    id uuid default uuid_generate_v4() primary key,
    scan_id uuid references public.scans(id) on delete cascade not null,
    plant_id uuid references public.plants(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    status text check (status in ('Pending', 'Reviewed')) default 'Pending',
    expert_reply text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. DISEASES REFERENCE SEED TABLE (Read-only reference)
create table public.diseases_reference (
    id text primary key,
    name text not null,
    description text not null,
    symptoms text not null,
    prevention text not null,
    organic_treatments text[] not null,
    chemical_treatments text[] not null
);

-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.plants enable row level security;
alter table public.scans enable row level security;
alter table public.treatments enable row level security;
alter table public.notes enable row level security;
alter table public.notifications enable row level security;
alter table public.team_members enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.expert_reviews enable row level security;
alter table public.diseases_reference enable row level security;

-- ROW LEVEL SECURITY POLICIES

-- profiles
create policy "Users can view any profile" on public.profiles for select using (true);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- farms (Owner can read/write, team members of farm can view)
create policy "Users can view farms they own or belong to" on public.farms for select
using (auth.uid() = user_id or exists (select 1 from public.team_members where farm_id = id and email = auth.jwt()->>'email'));

create policy "Users can insert their own farms" on public.farms for insert with check (auth.uid() = user_id);
create policy "Users can update their own farms" on public.farms for update using (auth.uid() = user_id);
create policy "Users can delete their own farms" on public.farms for delete using (auth.uid() = user_id);

-- plants
create policy "Users can view plants they own or have farm access to" on public.plants for select
using (auth.uid() = user_id or exists (select 1 from public.team_members where farm_id = farm_id and email = auth.jwt()->>'email'));

create policy "Users can insert their own plants" on public.plants for insert with check (auth.uid() = user_id);
create policy "Users can update their own plants" on public.plants for update using (auth.uid() = user_id);
create policy "Users can delete their own plants" on public.plants for delete using (auth.uid() = user_id);

-- scans
create policy "Users can view their own scans" on public.scans for select using (auth.uid() = user_id);
create policy "Users can create their own scans" on public.scans for insert with check (auth.uid() = user_id);

-- treatments
create policy "Users can view their own treatments" on public.treatments for select using (auth.uid() = user_id);
create policy "Users can update their own treatments" on public.treatments for update using (auth.uid() = user_id);
create policy "Users can create their own treatments" on public.treatments for insert with check (auth.uid() = user_id);

-- notes
create policy "Users can view their own notes" on public.notes for select using (auth.uid() = user_id);
create policy "Users can modify their own notes" on public.notes for all using (auth.uid() = user_id);

-- notifications
create policy "Users can view their own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update their own notifications" on public.notifications for update using (auth.uid() = user_id);

-- forum posts (anyone can view, authenticated can insert/update/delete own)
create policy "Anyone can view forum posts" on public.forum_posts for select using (true);
create policy "Authenticated users can create posts" on public.forum_posts for insert with check (auth.uid() = user_id);
create policy "Authors can update posts" on public.forum_posts for update using (auth.uid() = user_id);
create policy "Authors can delete posts" on public.forum_posts for delete using (auth.uid() = user_id);

-- forum comments
create policy "Anyone can view comments" on public.forum_comments for select using (true);
create policy "Authenticated users can create comments" on public.forum_comments for insert with check (auth.uid() = user_id);
create policy "Authors can delete comments" on public.forum_comments for delete using (auth.uid() = user_id);

-- expert reviews
create policy "Users can view their expert reviews" on public.expert_reviews for select using (auth.uid() = user_id);
create policy "Users can request expert reviews" on public.expert_reviews for insert with check (auth.uid() = user_id);

-- diseases reference (Read-only for all signed in users)
create policy "Anyone can view diseases reference" on public.diseases_reference for select using (true);

-- PROFILE AUTO-CREATION TRIGGER
-- Automatically creates a profile record in public.profiles when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url, account_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://picsum.photos/seed/' || new.id || '/150/150'),
    coalesce(new.raw_user_meta_data->>'account_type', 'Gardener')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SEED DATA FOR DISEASES REFERENCE TABLE
insert into public.diseases_reference (id, name, description, symptoms, prevention, organic_treatments, chemical_treatments)
values 
('tomato-late-blight', 'Tomato Late Blight', 'A devastating disease caused by Phytophthora infestans that ruins tomatoes.', 'Water-soaked spots, white fuzzy mold, brown fruit lesions', 'Avoid overhead watering, keep generous spacing, rotate crops', array['Prune affected foliage', 'Copper-based fungicides', 'Baking soda spray'], array['Chlorothalonil', 'Mancozeb', 'Mefenoxam']),
('powdery-mildew', 'Powdery Mildew', 'Fungal coating causing leaves to turn white, yellow, or drop prematurely.', 'White/gray powdery residue, leaf distortion', 'Provide full sun, clean air drainage, trim lower foliage', array['Neem oil spray', 'Milk solution spray', 'Potassium bicarbonate'], array['Triadimefon', 'Myclobutanil', 'Copper sulfate']),
('black-spot', 'Black Spot (Roses)', 'Highly destructive fungal pathogen attacking rose bushes.', 'Feathery dark spots on upper leaf surface, rapid leaf shedding', 'De-leaf lower stems, sweep fallen leaves, water base', array['Organic sulfur dusting', 'Neem oil', 'Sanitize tools'], array['Triforine', 'Tebuconazole', 'Chlorothalonil']);
