import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const { signInWithMicrosoft, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleMicrosoftSignIn = async () => {
    try {
      await signInWithMicrosoft();
    } catch (error) {
      console.error("Sign in error:", error);
      toast({
        title: "Sign in failed",
        description: error instanceof Error ? error.message : "Failed to sign in with Microsoft",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-hover">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary">
            <BarChart3 className="h-10 w-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">Welcome to SalesPro</CardTitle>
            <CardDescription className="mt-2 text-base">
              Sign in with your Microsoft account to access the Odoo analytics dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleMicrosoftSignIn}
            className="w-full gap-2 py-6 text-base"
            size="lg"
          >
            <svg className="h-5 w-5" viewBox="0 0 23 23" fill="none">
              <path d="M11 0H0v11h11V0z" fill="#f25022" />
              <path d="M23 0H12v11h11V0z" fill="#7fba00" />
              <path d="M11 12H0v11h11V12z" fill="#00a4ef" />
              <path d="M23 12H12v11h11V12z" fill="#ffb900" />
            </svg>
            Sign in with Microsoft
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
