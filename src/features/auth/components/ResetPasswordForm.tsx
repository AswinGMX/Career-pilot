import { useMemo, useState } from "react";

import { Button, Field } from "@/shared/components";

interface ResetPasswordFormProps {
  isSubmitting: boolean;
  onSubmit: (payload: { password: string }) => Promise<void>;
}

export function ResetPasswordForm({ isSubmitting, onSubmit }: ResetPasswordFormProps): JSX.Element {
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const passwordsMatch = useMemo(() => password.length > 0 && password === confirmPassword, [confirmPassword, password]);
  const isSubmitDisabled = isSubmitting || !passwordsMatch || password.length < 6;

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        if (!passwordsMatch) {
          return;
        }

        void onSubmit({ password });
      }}
    >
      <Field htmlFor="reset-password" label="New password">
        <input
          id="reset-password"
          className="input"
          type="password"
          minLength={6}
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>
      <Field
        htmlFor="reset-confirm-password"
        label="Confirm password"
        helperText={confirmPassword && !passwordsMatch ? "Passwords must match." : undefined}
        helperTone="error"
      >
        <input
          id="reset-confirm-password"
          className="input"
          type="password"
          minLength={6}
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </Field>
      <Button disabled={isSubmitDisabled} type="submit" variant="primary">
        {isSubmitting ? "Updating password..." : "Update password"}
      </Button>
      {!isSubmitting && isSubmitDisabled ? (
        <p className="support-copy">Use a password with at least 6 characters and make sure both password fields match.</p>
      ) : null}
    </form>
  );
}
