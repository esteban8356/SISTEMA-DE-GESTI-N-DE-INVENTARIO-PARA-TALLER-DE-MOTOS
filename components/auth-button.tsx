import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { User } from "lucide-react";

export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-3 text-xs sm:text-sm text-foreground">
      <div className="flex items-center gap-1.5 font-medium">
        <User className="w-4 h-4 text-muted-foreground" />
        <span className="hidden sm:inline max-w-[150px] truncate">{user.email}</span>
      </div>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant="outline" className="text-xs font-semibold">
        <Link href="/auth/login">Iniciar Sesión</Link>
      </Button>
      <Button asChild size="sm" className="text-xs font-semibold">
        <Link href="/auth/sign-up">Registrarse</Link>
      </Button>
    </div>
  );
}

