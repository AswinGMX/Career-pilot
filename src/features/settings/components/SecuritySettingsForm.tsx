import { Button, Card, Field } from "@/shared/components";

interface SecuritySettingsFormProps {
  values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  passwordsMatch: boolean;
  isSubmitting: boolean;
  onChange: (field: "currentPassword" | "newPassword" | "confirmPassword", value: string) => void;
  onSubmit: () => Promise<void>;
}

export function SecuritySettingsForm({
  isSubmitting,
  onChange,
  onSubmit,
  passwordsMatch,
  values
}: SecuritySettingsFormProps): JSX.Element {
  const isSubmitDisabled = isSubmitting || !passwordsMatch || !values.currentPassword;

  return (
    <Card className="stack">
      <div className="card__header">
        <div>
          <p className="eyebrow">Security</p>
          <h2>Rotate your password safely</h2>
        </div>
      </div>
      <Field htmlFor="current-password" label="Current password">
        <input
          id="current-password"
          className="input"
          type="password"
          value={values.currentPassword}
          onChange={(event) => onChange("currentPassword", event.target.value)}
        />
      </Field>
      <Field htmlFor="new-password" label="New password">
        <input
          id="new-password"
          className="input"
          type="password"
          value={values.newPassword}
          onChange={(event) => onChange("newPassword", event.target.value)}
        />
      </Field>
      <Field
        htmlFor="confirm-password"
        label="Confirm password"
        helperText={values.confirmPassword && !passwordsMatch ? "Passwords must match." : undefined}
        helperTone="error"
      >
        <input
          id="confirm-password"
          className="input"
          type="password"
          value={values.confirmPassword}
          onChange={(event) => onChange("confirmPassword", event.target.value)}
        />
      </Field>
      <div className="actions">
        <Button disabled={isSubmitDisabled} variant="primary" onClick={() => void onSubmit()}>
          {isSubmitting ? "Saving..." : "Update password"}
        </Button>
      </div>
      {!isSubmitting && isSubmitDisabled ? (
        <p className="support-copy">
          Enter your current password, then make sure the new password is at least 6 characters and matches the
          confirmation.
        </p>
      ) : null}
    </Card>
  );
}
