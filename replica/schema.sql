-- Not used in v1 (progress is local). Applied when cross-device sync is added.
-- Supabase Postgres. Access: row level security, owner-only.

create table lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,                       -- matches content id, e.g. 'ja-1-01'
  position_segment integer not null default 0 check (position_segment >= 0),
  plays integer not null default 0 check (plays >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table item_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,                         -- matches content item id
  due_at timestamptz not null default now(),
  interval_days real not null default 0 check (interval_days >= 0),
  ease real not null default 2.5 check (ease >= 1.3),
  reps integer not null default 0 check (reps >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id)
);
create index on item_reviews (user_id, due_at);

create table study_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,                             -- the learner's local date
  minutes integer not null default 0 check (minutes >= 0),
  primary key (user_id, day)
);

alter table lesson_progress enable row level security;
alter table item_reviews enable row level security;
alter table study_days enable row level security;

create policy own_rows on lesson_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on item_reviews    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy own_rows on study_days      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
