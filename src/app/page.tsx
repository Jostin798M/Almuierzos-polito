import Dashboard from "@/components/Dashboard";
import { loadDashboard, type Dashboard as Data } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  let data: Data;
  try {
    data = await loadDashboard();
  } catch (e) {
    return <SetupHelp message={e instanceof Error ? e.message : String(e)} />;
  }
  return <Dashboard data={data} />;
}

function SetupHelp({ message }: { message: string }) {
  const missingEnv = /Faltan|SUPABASE|fetch failed|Invalid API key|Invalid URL/i.test(message);
  const missingTables = /relation|does not exist|schema cache|Could not find the table/i.test(message);

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="panel p-6">
        <h1 className="font-display text-xl font-semibold">Falta terminar la conexión con Supabase</h1>
        <p className="mt-2 text-sm text-suave">El tablero no pudo leer los datos. Esto fue lo que respondio:</p>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-fondo p-3 text-xs">{message}</pre>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          {missingEnv && (
            <li>
              Revisa que <code>SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code> estén en las variables de
              entorno (en Vercel: Settings, Environment Variables) y vuelve a desplegar.
            </li>
          )}
          {missingTables && (
            <li>
              Ejecuta el archivo <code>supabase/schema.sql</code> en Supabase, SQL Editor.
            </li>
          )}
          {!missingEnv && !missingTables && <li>Revisa la guía del README, sección &quot;Si algo falla&quot;.</li>}
        </ol>
      </div>
    </main>
  );
}
