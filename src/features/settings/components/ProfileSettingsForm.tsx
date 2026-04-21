import { Button, Card, Field } from "@/shared/components";

interface ProfileSettingsFormProps {
  email: string;
  tenantLabel: string;
  values: {
    fullName: string;
    grade: string;
  };
  isSubmitting: boolean;
  onChange: (field: "fullName" | "grade", value: string) => void;
  onSubmit: () => Promise<void>;
}

export function ProfileSettingsForm({
  email,
  isSubmitting,
  onChange,
  onSubmit,
  tenantLabel,
  values
}: ProfileSettingsFormProps): JSX.Element {
  return (
    <Card className="stack">
      <div className="card__header">
        <div>
          <p className="eyebrow">Profile settings</p>
          <h2>Keep your identity and grade up to date</h2>
        </div>
      </div>
      <div className="form-row">
        <Field htmlFor="settings-email" label="Email">
          <input id="settings-email" className="input input--readonly" readOnly value={email} />
        </Field>
        <Field htmlFor="settings-tenant" label="Workspace">
          <input id="settings-tenant" className="input input--readonly" readOnly value={tenantLabel} />
        </Field>
      </div>
      <div className="form-row">
        <Field htmlFor="settings-full-name" label="Full name">
          <input
            id="settings-full-name"
            className="input"
            value={values.fullName}
            onChange={(event) => onChange("fullName", event.target.value)}
          />
        </Field>
        <Field htmlFor="settings-grade" label="Grade / stage">
          <input
            id="settings-grade"
            className="input"
            value={values.grade}
            onChange={(event) => onChange("grade", event.target.value)}
          />
        </Field>
      </div>
      <div className="actions">
        <Button disabled={isSubmitting} variant="primary" onClick={() => void onSubmit()}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </Card>
  );
}
