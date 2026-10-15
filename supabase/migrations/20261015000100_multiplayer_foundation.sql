create extension if not exists pgcrypto;

create type public.game_phase as enum ('lobby', 'night_zero', 'day', 'night', 'morning', 'finished');
create type public.game_player_status as enum ('connected', 'disconnected', 'removed', 'eliminated');
create type public.role_kind as enum ('villager', 'werewolf');

create table public.games (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique check (room_code ~ '^[A-Z0-9]{6}$'),
  moderator_id uuid not null references auth.users(id) on delete restrict,
  ruleset_id text not null,
  ruleset_version text not null,
  player_limit smallint not null default 12 check (player_limit between 10 and 12),
  werewolf_count smallint not null default 2 check (werewolf_count between 1 and 4),
  phase public.game_phase not null default 'lobby',
  round_number smallint not null default 0 check (round_number >= 0),
  lobby_open boolean not null default true,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  session_token_hash text not null unique,
  display_name text not null check (char_length(display_name) between 1 and 32),
  status public.game_player_status not null default 'connected',
  seat_number smallint not null check (seat_number between 1 and 12),
  last_seen_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  unique (game_id, seat_number),
  unique (game_id, display_name)
);

create table public.game_roles (
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid primary key references public.game_players(id) on delete cascade,
  role public.role_kind not null,
  assigned_at timestamptz not null default now()
);

create table public.game_ruleset_snapshots (
  game_id uuid primary key references public.games(id) on delete cascade,
  ruleset_id text not null,
  ruleset_version text not null,
  definition jsonb not null,
  created_at timestamptz not null default now()
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null,
  voter_player_id uuid not null references public.game_players(id) on delete cascade,
  trust_target_player_id uuid references public.game_players(id) on delete restrict,
  distrust_target_player_id uuid references public.game_players(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  unique (game_id, round_number, voter_player_id),
  check (trust_target_player_id is not null or distrust_target_player_id is not null)
);

create table public.night_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null,
  player_id uuid not null references public.game_players(id) on delete cascade,
  location_id text,
  stays_home boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (game_id, round_number, player_id),
  check (stays_home or location_id is not null)
);

create table public.wolf_burn_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null,
  wolf_player_id uuid not null references public.game_players(id) on delete cascade,
  location_id text,
  submitted_at timestamptz not null default now(),
  unique (game_id, round_number, wolf_player_id)
);

create table public.game_effects (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null,
  effect_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (game_id, round_number, effect_type)
);

create table public.private_information (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null,
  player_id uuid not null references public.game_players(id) on delete cascade,
  sheet jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  unique (game_id, round_number, player_id)
);

create table public.moderator_approvals (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number smallint not null,
  phase public.game_phase not null,
  draft jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  unique (game_id, round_number, phase)
);

create table public.game_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index game_players_game_idx on public.game_players(game_id, status);
create index votes_game_round_idx on public.votes(game_id, round_number);
create index night_actions_game_round_idx on public.night_actions(game_id, round_number);
create index wolf_burn_actions_game_round_idx on public.wolf_burn_actions(game_id, round_number);
create index game_events_game_created_idx on public.game_events(game_id, created_at desc);

alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_roles enable row level security;
alter table public.game_ruleset_snapshots enable row level security;
alter table public.votes enable row level security;
alter table public.night_actions enable row level security;
alter table public.wolf_burn_actions enable row level security;
alter table public.game_effects enable row level security;
alter table public.private_information enable row level security;
alter table public.moderator_approvals enable row level security;
alter table public.game_events enable row level security;

create policy games_moderator_all on public.games for all to authenticated using ((select auth.uid()) = moderator_id) with check ((select auth.uid()) = moderator_id);
create policy players_moderator_all on public.game_players for all to authenticated using (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid()))) with check (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid())));
create policy players_self_select on public.game_players for select to authenticated using (user_id = (select auth.uid()));
create policy roles_moderator_all on public.game_roles for all to authenticated using (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid()))) with check (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid())));
create policy roles_self_select on public.game_roles for select to authenticated using (exists (select 1 from public.game_players p where p.id = player_id and p.user_id = (select auth.uid())));
create policy snapshots_moderator_all on public.game_ruleset_snapshots for all to authenticated using (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid()))) with check (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid())));
create policy votes_moderator_select on public.votes for select to authenticated using (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid())));
create policy votes_self_all on public.votes for all to authenticated using (exists (select 1 from public.game_players p where p.id = voter_player_id and p.user_id = (select auth.uid()))) with check (exists (select 1 from public.game_players p where p.id = voter_player_id and p.user_id = (select auth.uid())));
create policy night_actions_moderator_select on public.night_actions for select to authenticated using (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid())));
create policy night_actions_self_all on public.night_actions for all to authenticated using (exists (select 1 from public.game_players p where p.id = player_id and p.user_id = (select auth.uid()))) with check (exists (select 1 from public.game_players p where p.id = player_id and p.user_id = (select auth.uid())));
create policy burn_moderator_all on public.wolf_burn_actions for all to authenticated using (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid()))) with check (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid())));
create policy burn_wolf_self_all on public.wolf_burn_actions for all to authenticated using (exists (select 1 from public.game_roles r join public.game_players p on p.id = r.player_id where r.player_id = wolf_player_id and r.role = 'werewolf' and p.user_id = (select auth.uid()))) with check (exists (select 1 from public.game_roles r join public.game_players p on p.id = r.player_id where r.player_id = wolf_player_id and r.role = 'werewolf' and p.user_id = (select auth.uid())));
create policy effects_moderator_all on public.game_effects for all to authenticated using (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid()))) with check (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid())));
create policy private_moderator_all on public.private_information for all to authenticated using (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid()))) with check (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid())));
create policy private_self_select on public.private_information for select to authenticated using (exists (select 1 from public.game_players p where p.id = player_id and p.user_id = (select auth.uid())));
create policy approvals_moderator_all on public.moderator_approvals for all to authenticated using (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid()))) with check (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid())));
create policy events_moderator_all on public.game_events for all to authenticated using (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid()))) with check (exists (select 1 from public.games g where g.id = game_id and g.moderator_id = (select auth.uid())));

alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.game_effects;
alter publication supabase_realtime add table public.game_events;

comment on table public.game_roles is 'Never expose this table through public realtime channels.';
comment on table public.votes is 'Private submissions; only the voter and moderator may read.';
comment on table public.private_information is 'Private sheets; only the target player and moderator may read.';
