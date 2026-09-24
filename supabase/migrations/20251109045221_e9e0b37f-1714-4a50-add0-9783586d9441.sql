-- =====================================================
-- FEMA Warehouse Management System - Database Schema
-- =====================================================

-- 1. CREATE ROLE ENUM
-- =====================================================

create type public.app_role as enum (
  'admin',
  'manager', 
  'technician',
  'staff',
  'viewer'
);

-- 2. CREATE USER ROLES TABLE
-- =====================================================

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz default now() not null,
  created_by uuid references auth.users(id),
  unique (user_id, role)
);

-- 3. CREATE SECURITY DEFINER FUNCTION (after user_roles table exists)
-- =====================================================

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- 4. CREATE PROFILES TABLE
-- =====================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 5. CREATE WAREHOUSES TABLE
-- =====================================================

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  location text,
  address text,
  city text,
  state text,
  zip_code text,
  contact_name text,
  contact_phone text,
  contact_email text,
  capacity integer,
  active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references auth.users(id)
);

-- 6. CREATE EQUIPMENT TABLE
-- =====================================================

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null unique,
  name text not null,
  description text,
  category text,
  serial_number text,
  manufacturer text,
  model text,
  purchase_date date,
  purchase_price numeric(12, 2),
  condition text check (condition in ('excellent', 'good', 'fair', 'poor', 'damaged')),
  status text not null default 'available' check (status in ('available', 'checked_out', 'maintenance', 'retired')),
  warehouse_id uuid references public.warehouses(id) on delete set null,
  location_in_warehouse text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references auth.users(id)
);

-- 7. CREATE STAFF TABLE
-- =====================================================

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  employee_id text unique,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  department text,
  position text,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  hire_date date,
  employment_status text default 'active' check (employment_status in ('active', 'inactive', 'terminated')),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references auth.users(id)
);

-- 8. CREATE CERTIFICATIONS TABLE
-- =====================================================

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff(id) on delete cascade not null,
  name text not null,
  certification_type text,
  issuing_organization text,
  certification_number text,
  issue_date date not null,
  expiry_date date,
  status text default 'valid' check (status in ('valid', 'expiring', 'expired', 'revoked')),
  document_url text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references auth.users(id)
);

-- 9. CREATE EQUIPMENT CHECKOUTS TABLE
-- =====================================================

create table public.equipment_checkouts (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid references public.equipment(id) on delete cascade not null,
  staff_id uuid references public.staff(id) on delete set null,
  checked_out_by uuid references auth.users(id) not null,
  checkout_date timestamptz default now() not null,
  due_date timestamptz,
  purpose text,
  deployment_location text,
  checkout_notes text,
  
  checked_in_by uuid references auth.users(id),
  checkin_date timestamptz,
  return_condition text check (return_condition in ('excellent', 'good', 'fair', 'poor', 'damaged')),
  return_location text,
  checkin_notes text,
  
  status text default 'active' check (status in ('active', 'returned', 'overdue', 'lost')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 10. CREATE MAINTENANCE RECORDS TABLE
-- =====================================================

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid references public.equipment(id) on delete cascade not null,
  maintenance_type text not null check (maintenance_type in ('preventive', 'corrective', 'inspection', 'calibration', 'repair', 'replacement')),
  scheduled_date date,
  completed_date date,
  performed_by uuid references public.staff(id) on delete set null,
  description text not null,
  parts_replaced text,
  cost numeric(12, 2),
  vendor text,
  next_maintenance_date date,
  status text default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  priority text check (priority in ('low', 'medium', 'high', 'critical')),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid references auth.users(id)
);

-- 11. CREATE AUDIT LOGS TABLE
-- =====================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references auth.users(id),
  changed_at timestamptz default now() not null,
  ip_address inet,
  user_agent text
);

-- 12. ENABLE ROW LEVEL SECURITY
-- =====================================================

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.warehouses enable row level security;
alter table public.equipment enable row level security;
alter table public.staff enable row level security;
alter table public.certifications enable row level security;
alter table public.equipment_checkouts enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.audit_logs enable row level security;

-- 13. CREATE RLS POLICIES
-- =====================================================

-- User Roles Policies
create policy "Users can view own roles"
on public.user_roles for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage all roles"
on public.user_roles for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Profiles Policies
create policy "Profiles viewable by authenticated users"
on public.profiles for select
to authenticated
using (true);

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid());

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

-- Warehouses Policies
create policy "Warehouses viewable by all authenticated users"
on public.warehouses for select
to authenticated
using (true);

create policy "Managers and admins can manage warehouses"
on public.warehouses for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
)
with check (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- Equipment Policies
create policy "Equipment viewable by all authenticated users"
on public.equipment for select
to authenticated
using (true);

create policy "Staff and above can insert equipment"
on public.equipment for insert
to authenticated
with check (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'technician') OR
  public.has_role(auth.uid(), 'staff')
);

create policy "Managers and admins can update equipment"
on public.equipment for update
to authenticated
using (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

create policy "Admins can delete equipment"
on public.equipment for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Staff Policies
create policy "Staff viewable by all authenticated users"
on public.staff for select
to authenticated
using (true);

create policy "Managers and admins can manage staff"
on public.staff for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
)
with check (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- Certifications Policies
create policy "Certifications viewable by all authenticated users"
on public.certifications for select
to authenticated
using (true);

create policy "Managers and admins can manage certifications"
on public.certifications for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
)
with check (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- Equipment Checkouts Policies
create policy "Checkouts viewable by all authenticated users"
on public.equipment_checkouts for select
to authenticated
using (true);

create policy "Staff and above can create checkouts"
on public.equipment_checkouts for insert
to authenticated
with check (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'technician') OR
  public.has_role(auth.uid(), 'staff')
);

create policy "Staff and above can update checkouts"
on public.equipment_checkouts for update
to authenticated
using (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'technician') OR
  public.has_role(auth.uid(), 'staff')
);

-- Maintenance Records Policies
create policy "Maintenance records viewable by all authenticated users"
on public.maintenance_records for select
to authenticated
using (true);

create policy "Technicians and above can manage maintenance"
on public.maintenance_records for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'technician')
)
with check (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'technician')
);

-- Audit Logs Policies
create policy "Audit logs viewable by admins only"
on public.audit_logs for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "System can insert audit logs"
on public.audit_logs for insert
to authenticated
with check (true);

-- 14. CREATE TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at triggers to all tables
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_warehouses_updated_at
  before update on public.warehouses
  for each row execute function public.update_updated_at_column();

create trigger update_equipment_updated_at
  before update on public.equipment
  for each row execute function public.update_updated_at_column();

create trigger update_staff_updated_at
  before update on public.staff
  for each row execute function public.update_updated_at_column();

create trigger update_certifications_updated_at
  before update on public.certifications
  for each row execute function public.update_updated_at_column();

create trigger update_equipment_checkouts_updated_at
  before update on public.equipment_checkouts
  for each row execute function public.update_updated_at_column();

create trigger update_maintenance_records_updated_at
  before update on public.maintenance_records
  for each row execute function public.update_updated_at_column();

-- Function to create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    new.email
  );
  return new;
end;
$$;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to log audit trail
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    insert into public.audit_logs (table_name, record_id, action, old_data, changed_by)
    values (tg_table_name, old.id, tg_op, row_to_json(old), auth.uid());
    return old;
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    values (tg_table_name, new.id, tg_op, row_to_json(old), row_to_json(new), auth.uid());
    return new;
  elsif (tg_op = 'INSERT') then
    insert into public.audit_logs (table_name, record_id, action, new_data, changed_by)
    values (tg_table_name, new.id, tg_op, row_to_json(new), auth.uid());
    return new;
  end if;
  return null;
end;
$$;

-- Apply audit triggers to critical tables
create trigger audit_equipment
  after insert or update or delete on public.equipment
  for each row execute function public.audit_trigger();

create trigger audit_equipment_checkouts
  after insert or update or delete on public.equipment_checkouts
  for each row execute function public.audit_trigger();

create trigger audit_maintenance_records
  after insert or update or delete on public.maintenance_records
  for each row execute function public.audit_trigger();

create trigger audit_user_roles
  after insert or update or delete on public.user_roles
  for each row execute function public.audit_trigger();

-- 15. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- User Roles indexes
create index idx_user_roles_user_id on public.user_roles(user_id);
create index idx_user_roles_role on public.user_roles(role);

-- Equipment indexes
create index idx_equipment_warehouse_id on public.equipment(warehouse_id);
create index idx_equipment_status on public.equipment(status);
create index idx_equipment_category on public.equipment(category);
create index idx_equipment_asset_tag on public.equipment(asset_tag);

-- Staff indexes
create index idx_staff_user_id on public.staff(user_id);
create index idx_staff_warehouse_id on public.staff(warehouse_id);
create index idx_staff_employment_status on public.staff(employment_status);
create index idx_staff_email on public.staff(email);

-- Certifications indexes
create index idx_certifications_staff_id on public.certifications(staff_id);
create index idx_certifications_status on public.certifications(status);
create index idx_certifications_expiry_date on public.certifications(expiry_date);

-- Equipment Checkouts indexes
create index idx_checkouts_equipment_id on public.equipment_checkouts(equipment_id);
create index idx_checkouts_staff_id on public.equipment_checkouts(staff_id);
create index idx_checkouts_status on public.equipment_checkouts(status);
create index idx_checkouts_due_date on public.equipment_checkouts(due_date);

-- Maintenance Records indexes
create index idx_maintenance_equipment_id on public.maintenance_records(equipment_id);
create index idx_maintenance_performed_by on public.maintenance_records(performed_by);
create index idx_maintenance_status on public.maintenance_records(status);
create index idx_maintenance_scheduled_date on public.maintenance_records(scheduled_date);

-- Audit Logs indexes
create index idx_audit_logs_table_name on public.audit_logs(table_name);
create index idx_audit_logs_record_id on public.audit_logs(record_id);
create index idx_audit_logs_changed_by on public.audit_logs(changed_by);
create index idx_audit_logs_changed_at on public.audit_logs(changed_at);