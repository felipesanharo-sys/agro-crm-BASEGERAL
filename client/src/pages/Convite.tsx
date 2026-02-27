import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { BarChart3, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function Convite() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: invite, isLoading } = trpc.invites.getByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  const acceptMutation = trpc.invites.accept.useMutation({
    onSuccess: () => {
      // Redirect to home after accepting
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    },
  });

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <XCircle className="h-16 w-16 text-destructive" />
            <h2 className="text-xl font-bold">Convite Inválido</h2>
            <p className="text-muted-foreground text-center">
              Este link de convite não é válido ou já expirou.
            </p>
            <Button onClick={() => setLocation("/")} variant="outline">
              Ir para o início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.used) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <CheckCircle2 className="h-16 w-16 text-primary" />
            <h2 className="text-xl font-bold">Convite Já Utilizado</h2>
            <p className="text-muted-foreground text-center">
              Este convite já foi aceito anteriormente.
            </p>
            <Button onClick={() => setLocation("/")} variant="outline">
              Ir para o início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <CheckCircle2 className="h-16 w-16 text-primary" />
            <h2 className="text-xl font-bold">Bem-vindo!</h2>
            <p className="text-muted-foreground text-center">
              Sua conta foi vinculada com sucesso. Redirecionando...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md w-full mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle>Convite Agro CRM BA03</CardTitle>
          <CardDescription>
            Você foi convidado como{" "}
            <strong>{invite.isGestor ? "Gestor" : `RC ${invite.alias}`}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Faça login para aceitar o convite e acessar o sistema.
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
              >
                Fazer Login
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Logado como <strong>{user.name}</strong>. Clique abaixo para vincular sua conta.
              </p>
              <Button
                className="w-full"
                onClick={() => acceptMutation.mutate({ token: token || "" })}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Aceitar Convite
              </Button>
              {acceptMutation.isError && (
                <p className="text-sm text-destructive text-center">
                  {acceptMutation.error.message}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
