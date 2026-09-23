import { AuthButton } from "@/components/auth-button";
import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function AuthCheck() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return null;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-muted/10">
      <Suspense fallback={null}>
        <AuthCheck />
      </Suspense>
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <nav className="w-full flex justify-end p-4 border-b border-b-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 sticky top-0">
          <Suspense>
            <AuthButton />
          </Suspense>
        </nav>
        <div className="flex-1 flex flex-col p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
