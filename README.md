# Almuerzos Dashboard

Dashboard para llevar el control diario de almuerzos: pedidos por estado, cobros, deudores, lista negra y ganancias por trabajador. Hecho con Next.js, guarda los datos en Supabase y se despliega en Vercel.

## Qué hace

**Cinco estados por pedido**, que se mueven con las flechas de cada tarjeta:

1. En espera
2. Confirmado
3. Pagado, sin retirar
4. Retirado
5. Retirado, sin pagar

- **Pegar lista**: pegas tu lista tal cual (`1. @~Nombre`) y el sistema quita el número, el `@` y el `~`. Los nombres que son solo un punto se quedan como `.`. Avisa si alguien de la lista negra aparece, y omite los nombres que ya están hoy.
- **Extra**: un botón que agrega un pedido llamado "Extra". Toca el nombre de cualquier pedido para renombrarlo, ponerle una nota o cambiarle el precio.
- **Contador**: una celda por almuerzo, coloreada según su estado, y cuántos quedan según tu límite diario. Al llegar al límite, la lista pegada solo agrega los que caben (o todos, si lo eliges).
- **Cancelar**: el pedido se cancela y el nombre pasa a la lista negra (con motivo y fecha). Puedes quitar a alguien de la lista cuando quieras.
- **Deshacer**: revierte las últimas 30 acciones (mover estado, cancelar, editar, pegar lista, cobrar deudas).
- **Método de pago**: efectivo o cuenta. Al pasar un pedido a un estado pagado se marca efectivo; toca la etiqueta para cambiarlo.
- **Deudores**: todo lo que está en "Retirado, sin pagar", acumulado por persona a través de los días. Con un botón cobras todo lo que debe.
- **Ganancias**: día, semana y mes, con el desglose efectivo y cuenta, gastos e insumos (en %), sobrante y lo que gana cada trabajador por separado.
- **Exportar**: CSV y Excel del día, la semana o el mes.
- **PIN**: sin el PIN no se ve nada.

### Cómo se calcula el dinero

- **Vendido**: suma de todos los pedidos no cancelados.
- **Cobrado**: pedidos en *Pagado, sin retirar* y *Retirado*.
- **Por cobrar**: todo lo demás. De eso, *Retirado, sin pagar* es la **deuda**.
- **Gastos e insumos**: el porcentaje que configures, aplicado sobre lo cobrado.
- **Trabajadores**: cada uno gana un monto fijo por cada almuerzo **cobrado** (por ejemplo 0.75 y 1.75). Lo "pendiente" es lo que ganaría si se cobra lo que falta.
- **Sobrante**: cobrado, menos gastos, menos lo de los trabajadores.

### Cierre de día

Es automático: cada pedido guarda la fecha en la zona horaria del negocio (`APP_TIMEZONE`, por defecto `America/Guayaquil`). A medianoche el tablero empieza vacío, y la semana y el mes se calculan solos con el historial. No hay botón que apretar.

---

## Guía paso a paso

### 1. Crear la base de datos en Supabase

1. Entra a <https://supabase.com>, crea una cuenta y pulsa **New project**. Ponle un nombre, elige una contraseña para la base y la región más cercana a ti.
2. Espera a que termine de crearse (un par de minutos).
3. En el menú izquierdo abre **SQL Editor**, pulsa **New query**.
4. Abre el archivo `supabase/schema.sql` de este proyecto, copia todo su contenido, pégalo en el editor y pulsa **Run**. Debe decir "Success". Puedes ejecutarlo más de una vez sin problema.
5. Ve a **Project Settings**, luego **API** (o **API Keys**) y copia dos datos:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - la clave **service_role** (si el panel muestra una "secret key" nueva, usa esa)

> La clave `service_role` es secreta: da acceso total a la base. Solo se usa en el servidor de Vercel, nunca se pone en el navegador ni se sube a GitHub. La base además tiene RLS activado sin políticas, así que la clave pública (`anon`) no puede leer nada.

### 2. Probarlo en tu computadora

```bash
cd almuerzos-dashboard
cp .env.example .env.local
```

Edita `.env.local` y completa:

```
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=la-clave-service_role
APP_PIN=tu-pin
SESSION_SECRET=una-cadena-larga-aleatoria
```

Para generar `SESSION_SECRET`:

```bash
openssl rand -hex 32
```

Luego:

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>, entra con tu PIN y listo. Si falta algo de la conexión, la pantalla te dice qué.

### 3. Subirlo a Vercel

**Opción A: desde GitHub (recomendada)**

```bash
git init
git add .
git commit -m "Dashboard de almuerzos"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/almuerzos-dashboard.git
git push -u origin main
```

(Crea antes el repositorio vacío en GitHub, y déjalo **privado**.)

1. Entra a <https://vercel.com>, **Add New**, **Project**, e importa el repositorio.
2. Antes de pulsar Deploy, abre **Environment Variables** y agrega estas cuatro (las mismas de `.env.local`):

   | Nombre | Valor |
   | --- | --- |
   | `SUPABASE_URL` | tu Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | tu clave service_role |
   | `APP_PIN` | tu PIN |
   | `SESSION_SECRET` | la cadena aleatoria |

3. Pulsa **Deploy**. Vercel detecta Next.js solo; no hay que tocar nada más.

**Opción B: con la terminal**

```bash
npm i -g vercel
vercel login
vercel
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add APP_PIN
vercel env add SESSION_SECRET
vercel --prod
```

(Cada `vercel env add` te pide el valor y los entornos: marca Production, Preview y Development.)

**Recomendación:** en Vercel, **Settings**, **Functions**, elige una región cercana a la de tu proyecto de Supabase para que responda más rápido.

### 4. Uso diario

1. Pulsa **Pegar lista**, pega la lista del grupo y confirma.
2. A medida que pagan y retiran, mueve cada pedido con las flechas.
3. Si alguien cancela, pulsa la X de su tarjeta. Queda en la lista negra.
4. Si te equivocas, **Deshacer**.
5. Al final del día mira **Ganancias**. No hace falta cerrar nada.

---

## Ajustes

En la pestaña **Ajustes** puedes cambiar:

- **Precio base**, **límite diario** y **% de gastos e insumos**.
- **Precio solo de hoy**: sirve para un día con precio distinto. Mañana vuelve solo al base. Puedes aplicarlo a los pedidos que ya están hoy.
- **Trabajadores**: agrega, edita o elimina. Ajustes te muestra al instante cuánto sobra por almuerzo con tus montos.

## Cosas que conviene saber

- Los montos de los trabajadores se aplican con el valor **actual**: si cambias un monto, el historial se recalcula con el nuevo.
- Los pedidos que quedan en *En espera*, *Confirmado* o *Pagado, sin retirar* al terminar el día no pasan al tablero del día siguiente (siguen en el historial y en las exportaciones). Lo que sí se acumula es la deuda de *Retirado, sin pagar*.
- El plan gratuito de Supabase pausa los proyectos tras una semana sin uso. Si pasa, se reactiva desde su panel con un clic.
- Cambiar `APP_PIN` en Vercel (y volver a desplegar) cierra todas las sesiones abiertas.

## Si algo falla

| Síntoma | Qué hacer |
| --- | --- |
| "Falta terminar la conexión con Supabase" | Revisa las variables de entorno en Vercel y vuelve a desplegar (Deployments, los tres puntos, Redeploy). |
| Dice que no existe una tabla (`relation ... does not exist`) | Ejecuta `supabase/schema.sql` en el SQL Editor. |
| "Invalid API key" | Copiaste la clave equivocada: usa la `service_role` (secreta), no la `anon`. |
| "Falta SESSION_SECRET" | Agrega `SESSION_SECRET` (mínimo 16 caracteres). |
| El PIN no entra | Comprueba `APP_PIN` en Vercel. Tras cambiarla hay que volver a desplegar. |
| El día cambia a una hora rara | Ajusta `APP_TIMEZONE` (por ejemplo `America/Guayaquil`). |

## Estructura

```
supabase/schema.sql        tablas, restricciones y seguridad (RLS)
src/proxy.ts               pide el PIN en todas las rutas
src/app/actions.ts         acciones del servidor (pedidos, deshacer, lista negra, ajustes)
src/app/page.tsx           carga los datos y muestra el tablero
src/app/api/export/        exportación a CSV y Excel
src/lib/parser.ts          limpia la lista pegada
src/lib/calc.ts            totales, ganancias y deudores
src/components/            interfaz (tablero, contador, ganancias, deudores, ajustes)
scripts/test-parser.ts     prueba del lector de listas: npm run test:parser
```

## Tecnologías

Next.js 16, React 19, Tailwind CSS, Supabase, ExcelJS, iconos de Lucide y las fuentes Bricolage Grotesque y Hanken Grotesk (instaladas con npm, sin pedirlas a Google).
