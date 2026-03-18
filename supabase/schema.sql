-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  display_name text,
  avatar_url text,
  games_played integer default 0,
  wins integer default 0,
  losses integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Sessions table
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references auth.users not null,
  name text not null,
  status text check (status in ('active', 'completed')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Courts table
create table public.courts (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions on delete cascade not null,
  name text not null,
  status text check (status in ('open', 'in_use')) default 'open',
  current_game_id uuid, -- will reference games later
  order_index integer default 0
);

-- Create Queue Entries table
create table public.queue_entries (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions on delete cascade not null,
  player_ids uuid[] not null, -- Allows 1 to 4 players for partnerships/groups
  status text check (status in ('waiting', 'playing', 'resting')) default 'waiting',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  bucket_index integer default 0 -- For visual organization
);

-- Create Games table
create table public.games (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions on delete cascade not null,
  court_id uuid references public.courts on delete cascade not null,
  team1_player_ids uuid[] not null,
  team2_player_ids uuid[] not null,
  team1_score integer default 0,
  team2_score integer default 0,
  status text check (status in ('in_progress', 'completed')) default 'in_progress',
  winner_team integer check (winner_team in (1, 2)),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.courts enable row level security;
alter table public.queue_entries enable row level security;
alter table public.games enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

create policy "Sessions are viewable by everyone." on sessions for select using (true);
create policy "Authenticated users can create sessions." on sessions for insert with check (auth.role() = 'authenticated');

create policy "Courts are viewable by everyone." on courts for select using (true);
create policy "Queue entries are viewable by everyone." on queue_entries for select using (true);
create policy "Games are viewable by everyone." on games for select using (true);

-- Trigger for creating a profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Realtime setup (Enabling realtime for these tables)
begin;
  -- remove the existing realtime publication
  drop publication if exists supabase_realtime;
  -- create a new publication
  create publication supabase_realtime for table sessions, courts, queue_entries, games;
commit;
