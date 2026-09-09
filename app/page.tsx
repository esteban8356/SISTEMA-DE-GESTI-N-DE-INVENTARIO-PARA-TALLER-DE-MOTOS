import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Encabezado */}
      <header className="bg-white border-b border-slate-200 py-4 px-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center">
          <img
            src="https://tofcjiyedfyuhywbeaed.supabase.co/storage/v1/object/public/fotos%20de%20la%20pagina/logo.jpg"
            alt="Logo del Taller"
            className="h-16 md:h-20 w-auto object-contain rounded-md hover:scale-105 transition-transform"
          />
        </div>
        <div className="flex items-center gap-4">
          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense fallback={<span className="text-sm text-slate-500">Cargando...</span>}>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-5xl mx-auto mt-10 mb-20 px-6">

        {/* Sección de Bienvenida (Hero) */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-16 flex flex-col md:flex-row">
          <div className="p-10 flex-1 flex flex-col justify-center">
            <h2 className="text-4xl font-bold mb-4 text-slate-900">Bienvenido a tu Taller</h2>
            <p className="text-lg text-slate-600 mb-8">
              Un sistema de gestión simple y ordenado para llevar el control de tu inventario, clientes y reparaciones de motocicletas.
            </p>
            <div>
              <Link
                href={hasEnvVars ? "/sign-in" : "/"}
                className="inline-block bg-blue-600 text-white font-medium px-8 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Ingresar al Sistema
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 min-h-[350px] relative">
            <img
              src="https://tofcjiyedfyuhywbeaed.supabase.co/storage/v1/object/public/fotos%20de%20la%20pagina/foto%20con%20logo.jpg"
              alt="Taller de motos"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </section>

        {/* Sección de Características con Imágenes */}
        <section>
          <h3 className="text-2xl font-bold text-center mb-10 text-slate-800">¿Qué puedes gestionar?</h3>

          <div className="grid md:grid-cols-3 gap-8">

            {/* Tarjeta 1 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center flex flex-col items-center">
              <img
                src="https://tofcjiyedfyuhywbeaed.supabase.co/storage/v1/object/public/fotos%20de%20la%20pagina/1.png"
                alt="Inventario"
                className="w-full h-48 object-cover rounded-lg mb-5"
              />
              <h4 className="text-xl font-semibold mb-2">Control de Inventario</h4>
              <p className="text-slate-600 text-sm">
                Mantén un registro claro de repuestos, aceites y accesorios disponibles en tu taller.
              </p>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center flex flex-col items-center">
              <img
                src="https://tofcjiyedfyuhywbeaed.supabase.co/storage/v1/object/public/fotos%20de%20la%20pagina/2.png"
                alt="Reparaciones"
                className="w-full h-48 object-cover rounded-lg mb-5"
              />
              <h4 className="text-xl font-semibold mb-2">Órdenes de Trabajo</h4>
              <p className="text-slate-600 text-sm">
                Registra la entrada de motos, asigna reparaciones y sigue el progreso de cada trabajo.
              </p>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center flex flex-col items-center">
              <img
                src="https://tofcjiyedfyuhywbeaed.supabase.co/storage/v1/object/public/fotos%20de%20la%20pagina/3.png"
                alt="Clientes"
                className="w-full h-48 object-cover rounded-lg mb-5"
              />
              <h4 className="text-xl font-semibold mb-2">Gestión de Clientes</h4>
              <p className="text-slate-600 text-sm">
                Ten a mano el historial de cada cliente y sus motocicletas atendidas previamente.
              </p>
            </div>

          </div>
        </section>

      </main>

      {/* Pie de Página */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center mt-auto">
      </footer>
    </div>
  );
}
