-- Function to insert a new user into the public.users table
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    'user' -- Default role, can be adjusted
  );
  return new;
end;
$$;

-- Trigger to call the function when a new user is created in auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
