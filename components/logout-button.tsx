"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={logout}
      disabled={loading}
      className="gap-1.5 text-xs font-semibold cursor-pointer hover:text-destructive"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>{loading ? "Saliendo..." : "Cerrar Sesión"}</span>
    </Button>
  );
}

