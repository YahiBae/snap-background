import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, resetPassword } from "@/lib/auth";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requested, setRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = requestPasswordReset(email);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setRequested(true);
    toast.success(result.message);
  };

  const handleReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await resetPassword(email, newPassword);

    if (!result.ok) {
      toast.error(result.message);
      setSubmitting(false);
      return;
    }

    toast.success("Password updated. You can sign in now.");
    setSubmitting(false);
    setRequested(false);
    setNewPassword("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 neon-border">
        <h1 className="text-2xl font-heading font-bold mb-3 text-center">Password reset</h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          Request a reset and set a new strong password. Sessions expire automatically after 7 days.
        </p>

        <form className="space-y-3 mb-4" onSubmit={handleRequest}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-muted/30 border-border"
            />
          </div>
          <Button variant="cta-outline" className="w-full" type="submit">Request reset</Button>
        </form>

        {requested && (
          <form className="space-y-3 mb-6" onSubmit={handleReset}>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="At least 8 chars with letters and numbers"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="bg-muted/30 border-border"
              />
            </div>
            <Button variant="cta" className="w-full" type="submit" disabled={submitting}>
              {submitting ? "Updating..." : "Set new password"}
            </Button>
          </form>
        )}

        <div className="flex gap-3 justify-center">
          <Link to="/login">
            <Button variant="ghost">Back to sign in</Button>
          </Link>
          <Link to="/register">
            <Button variant="cta">Create account</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
