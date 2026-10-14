-- Almuerzos Dashboard: esquema completo.
-- Pegalo entero en Supabase > SQL Editor > New query > Run.
-- Se puede ejecutar varias veces sin romper nada.

create extension if not exists pgcrypto;

-- Ajustes generales (una sola fila, id = 1)
create table if not exists settings (
  id            int primary key default 1 check (id = 1),
  base_price    numeric(8,2) not null default 3.00,   -- precio base por almuerzo
  daily_limit   int          not null default 35,     -- maximo de almuerzos por dia
  cost_percent  numeric(5,2) not null default 0       -- % del precio que se va en gastos e insumos
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- Precio distinto para un dia concreto (si no existe, se usa base_price)
create table if not exists day_prices (
  day    date primary key,
  price  numeric(8,2) not null
);

-- Trabajadores y cuanto ganan por cada almuerzo cobrado
create table if not exists workers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  per_lunch  numeric(8,2) not null default 0,
  active     boolean not null default true,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

-- Pedidos. El dia (columna day) se calcula en la app con tu zona horaria.
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  day             date not null,
  name            text not null,
  status          text not null default 'en_espera'
                  check (status in ('en_espera','confirmado','pagado_sin_retirar','retirado','retirado_sin_pagar')),
  payment_method  text check (payment_method in ('efectivo','cuenta')),
  price           numeric(8,2) not null,
  note            text,
  is_extra        boolean not null default false,
  cancelled       boolean not null default false,
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists orders_day_idx on orders (day);
create index if not exists orders_status_idx on orders (status) where cancelled = false;

-- Lista negra
create table if not exists blacklist (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  name_key      text not null,                 -- nombre normalizado para comparar
  reason        text,
  cancelled_on  date not null,
  created_at    timestamptz not null default now()
);
create index if not exists blacklist_key_idx on blacklist (name_key);

-- Historial para poder deshacer
create table if not exists undo_log (
  id          bigint generated always as identity primary key,
  kind        text not null,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

-- Seguridad: la app usa la service_role key desde el servidor.
-- Activamos RLS sin politicas para que la anon key no pueda leer ni escribir nada.
alter table settings   enable row level security;
alter table day_prices enable row level security;
alter table workers    enable row level security;
alter table orders     enable row level security;
alter table blacklist  enable row level security;
alter table undo_log   enable row level security;

-- Trabajadores iniciales (editalos luego desde la app)
insert into workers (name, per_lunch, position)
select * from (values ('Yo', 0.75, 1), ('Empleado', 1.75, 2)) as v(name, per_lunch, position)
where not exists (select 1 from workers);
