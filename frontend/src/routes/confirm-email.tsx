import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/confirm-email")({
  validateSearch: (s: Record<string, unknown>) => ({
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Confirm your email — Tuungane" },
      { name: "description", content: "Please confirm your email address to complete your registration." },
    ],
  }),
  staticData: {
    hideHeaderOnMobile: true,
    hideHeader: true,
    hideFooter: true,
    hideBottomNavOnMobile: true,
  },
  component: ConfirmEmailPage,
});

function ConfirmEmailPage() {
  const { email } = Route.useSearch();
  const displayEmail = email || "your email address";

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 pt-24 md:pt-32 sm:px-6 lg:px-8 bg-gray-50/50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-5 ring-8 ring-primary/5">
            <Mail className="h-12 w-12 text-primary" strokeWidth={1.5} />
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-bold tracking-tight text-gray-900">
          Check your email
        </h2>
        <p className="mt-3 text-center text-base text-gray-600">
          We've sent a verification link to <br />
          <span className="font-semibold text-gray-900">{displayEmail}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-in slide-in-from-bottom-4 fade-in duration-700 delay-150 fill-mode-both">
        <Card className="border-gray-200/60 shadow-xl shadow-black/5 bg-white/80 backdrop-blur-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Next steps</CardTitle>
            <CardDescription className="text-sm">
              Click the link in the email we just sent you to verify your account and complete your signup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                You might need to check your spam folder if you don't see it within a few minutes.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2 pb-6">
            <Button asChild className="w-full" size="lg">
              <Link to="/login">
                Return to log in
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-center text-gray-500">
              Need help? <Link to="/contact" className="text-primary hover:underline font-medium">Contact Support</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
