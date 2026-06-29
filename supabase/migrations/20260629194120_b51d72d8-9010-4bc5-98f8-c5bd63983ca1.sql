alter table public.service_requests add column if not exists media_urls text[] not null default '{}'::text[];
alter table public.service_profiles add column if not exists media_urls text[] not null default '{}'::text[];

update public.service_requests
  set media_urls = array[attachment_url]
  where attachment_url is not null
    and (media_urls is null or array_length(media_urls, 1) is null);

alter table public.service_requests
  drop constraint if exists service_requests_media_urls_max;
alter table public.service_requests
  add constraint service_requests_media_urls_max
  check (coalesce(array_length(media_urls, 1), 0) <= 10);

alter table public.service_profiles
  drop constraint if exists service_profiles_media_urls_max;
alter table public.service_profiles
  add constraint service_profiles_media_urls_max
  check (coalesce(array_length(media_urls, 1), 0) <= 10);