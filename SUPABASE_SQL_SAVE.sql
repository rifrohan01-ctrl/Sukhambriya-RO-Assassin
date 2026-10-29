create table if not exists public.player_game_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weapon_type text not null default 'Infiltrator',
  refine_level integer not null default 0,
  zeny bigint not null default 20000,
  ores integer not null default 60,
  obb_boxes integer not null default 1000,
  arsenal jsonb not null default '[]'::jsonb,
  obb_inventory jsonb not null default '[]'::jsonb,
  equipped_weapon_id text,
  game_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.player_game_state enable row level security;
revoke all on public.player_game_state from anon, authenticated;
grant select on public.player_game_state to authenticated;
-- Only the server's Secret Key writes the state.
