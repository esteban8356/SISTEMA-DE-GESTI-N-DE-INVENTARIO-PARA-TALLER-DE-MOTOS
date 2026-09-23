export default function ProtectedPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Panel Principal (Inicio)</h1>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground bg-background">
        Bienvenido al sistema de taller de motos.
      </div>
    </div>
  );
}
