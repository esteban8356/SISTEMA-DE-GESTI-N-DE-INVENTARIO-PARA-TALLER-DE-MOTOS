"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar correo de recuperación");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card className="shadow-lg border-border">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl w-fit mb-2">
              <MailCheck className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Revisa tu Correo</CardTitle>
            <CardDescription>
              Hemos enviado un enlace de recuperación a tu correo electrónico.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link
              href="/auth/login"
              className="inline-block text-sm font-semibold text-primary hover:underline mt-2"
            >
              Volver al inicio de sesión
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Recuperar Contraseña</CardTitle>
            <CardDescription>
              Ingresa tu correo para recibir el enlace de restablecimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full mt-2 font-semibold" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isLoading ? "Enviando..." : "Enviar Enlace"}
              </Button>

              <div className="mt-2 text-center text-xs text-muted-foreground">
                ¿Recordaste tu contraseña?{" "}
                <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                  Iniciar Sesión
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
