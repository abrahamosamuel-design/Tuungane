create table public.job_opportunities (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    job_title text not null,
    company_name text not null,
    location text not null,
    qualification text,
    salary text,
    cover_image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table public.job_opportunities enable row level security;

-- Policies
create policy "Job opportunities are viewable by everyone"
    on public.job_opportunities
    for select using (true);

create policy "Authenticated users can create job opportunities"
    on public.job_opportunities
    for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update their own job opportunities"
    on public.job_opportunities
    for update
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can delete their own job opportunities"
    on public.job_opportunities
    for delete
    to authenticated
    using (auth.uid() = user_id);
