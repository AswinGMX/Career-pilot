"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSchoolStudent } from "@/lib/api";

export function CreateStudentForm({ tenantId }: { tenantId: string }): JSX.Element {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await createSchoolStudent(tenantId, {
        fullName,
        email,
        password
      });
      setFullName("");
      setEmail("");
      setPassword("");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create student.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-stack">
      <input
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        placeholder="Student full name"
        required
        className="field-control"
      />
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="student@school.com"
        required
        className="field-control"
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Temporary password"
        minLength={8}
        required
        className="field-control"
      />
      <button
        type="submit"
        disabled={pending}
        className="button-primary"
      >
        {pending ? "Creating..." : "Create student"}
      </button>
      {error ? <p className="status-text--error" style={{ margin: 0 }}>{error}</p> : null}
    </form>
  );
}
