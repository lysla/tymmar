CREATE VIEW "public"."v_employees" AS (
  select
    e.id,
    e.name,
    e.surname,
    e.user_id,
    e.settings_id,
    e.start_date,
    e.end_date,
    e.created_at,
    e.updated_at,
    u.email
  from public.employees e
  left join auth.users u
    on u.id = e.user_id
);