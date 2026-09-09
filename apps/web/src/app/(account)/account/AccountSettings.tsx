"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { AccountOptionsResponse, AccountProfile } from "@career-pilot/types";

import { SurfaceCard } from "@/components/page-chrome";
import { deleteAvatar, updateAccount, uploadAvatar } from "@/lib/api";

type Status = { kind: "error" | "success"; message: string } | null;

/** Renders one form's outcome. Kept identical across sections so the page reads consistently. */
function StatusLine({ status }: { status: Status }): JSX.Element | null {
  if (!status) {
    return null;
  }

  return (
    <p className={status.kind === "error" ? "status-text--error" : "status-text--success"} style={{ margin: 0 }}>
      {status.message}
    </p>
  );
}

function initials(account: AccountProfile): string {
  const source = [account.firstName, account.lastName].filter(Boolean).join(" ") || account.fullName || account.email;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function AccountSettings({
  account,
  options,
  memberSince
}: {
  account: AccountProfile;
  options: AccountOptionsResponse;
  /**
   * Preformatted on the server. Formatting a date in here instead would resolve
   * the locale twice — the server's default during SSR, the browser's during
   * hydration — and any difference between them ("April 22, 2026" vs
   * "22 April 2026") is a hydration mismatch that drops the whole root to
   * client rendering.
   */
  memberSince: string;
}): JSX.Element {
  const router = useRouter();

  return (
    <div className="section-stack">
      <PhotoSection account={account} onDone={() => router.refresh()} />
      <DetailsSection account={account} options={options} onDone={() => router.refresh()} />
      <AccountFactsCard account={account} memberSince={memberSince} />
    </div>
  );
}

function PhotoSection({ account, onDone }: { account: AccountProfile; onDone: () => void }): JSX.Element {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function run(action: () => Promise<unknown>, message: string): Promise<void> {
    setPending(true);
    setStatus(null);
    try {
      await action();
      setStatus({ kind: "success", message });
      onDone();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    } finally {
      setPending(false);
    }
  }

  return (
    <SurfaceCard title="Photo">
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        {account.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed, expiring URL; the optimizer cannot fetch it
          <img
            src={account.avatarUrl}
            alt=""
            width={72}
            height={72}
            style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div className="account-avatar-fallback" aria-hidden>
            {initials(account)}
          </div>
        )}

        <div className="form-stack" style={{ gap: 10 }}>
          <div className="button-row">
            <button
              type="button"
              className="button-primary"
              disabled={pending}
              onClick={() => fileInput.current?.click()}
            >
              {pending ? "Working…" : account.avatarUrl ? "Replace photo" : "Upload photo"}
            </button>
            {account.avatarUrl ? (
              <button
                type="button"
                className="button-secondary"
                disabled={pending}
                onClick={() => run(() => deleteAvatar(), "Photo removed.")}
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="muted-text" style={{ margin: 0, fontSize: 13 }}>
            PNG, JPEG or WebP, up to 5MB.
          </p>
          <StatusLine status={status} />
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Reset immediately so choosing the same file twice still fires.
            event.target.value = "";
            if (file) {
              void run(() => uploadAvatar(file), "Photo updated.");
            }
          }}
        />
      </div>
    </SurfaceCard>
  );
}

function DetailsSection({
  account,
  options,
  onDone
}: {
  account: AccountProfile;
  options: AccountOptionsResponse;
  onDone: () => void;
}): JSX.Element {
  const [firstName, setFirstName] = useState(account.firstName ?? "");
  const [lastName, setLastName] = useState(account.lastName ?? "");
  const [phone, setPhone] = useState(account.phone ?? "");
  const [timezone, setTimezone] = useState(account.timezone ?? "");
  const [locale, setLocale] = useState(account.locale ?? "");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // Offer the viewer's own zone even when the server list is unavailable, so
  // the most likely correct answer is always one click away.
  const browserZone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const zones = options.timezones.length > 0 ? options.timezones : [browserZone, timezone].filter(Boolean);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    try {
      // Empty string means "clear it"; the API distinguishes null from omitted.
      await updateAccount({
        firstName,
        lastName,
        phone: phone.trim() ? phone : null,
        timezone: timezone.trim() ? timezone : null,
        locale: locale.trim() ? locale : null
      });
      setStatus({ kind: "success", message: "Details saved." });
      onDone();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Could not save your details." });
    } finally {
      setPending(false);
    }
  }

  return (
    <SurfaceCard title="Your details">
      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="field-label">
            First name
            <input
              className="field-control"
              value={firstName}
              maxLength={60}
              autoComplete="given-name"
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>
          <label className="field-label">
            Last name
            <input
              className="field-control"
              value={lastName}
              maxLength={60}
              autoComplete="family-name"
              onChange={(event) => setLastName(event.target.value)}
            />
          </label>
        </div>

        <div className="field-grid">
          <label className="field-label">
            Phone (optional)
            <input
              className="field-control"
              value={phone}
              placeholder="+919876543210"
              inputMode="tel"
              autoComplete="tel"
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <label className="field-label">
            Time zone
            <input
              className="field-control"
              list="account-timezones"
              value={timezone}
              placeholder={browserZone || "Asia/Kolkata"}
              onChange={(event) => setTimezone(event.target.value)}
            />
            <datalist id="account-timezones">
              {zones.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          </label>
          <label className="field-label">
            Language
            <input
              className="field-control"
              list="account-locales"
              value={locale}
              placeholder="en-IN"
              onChange={(event) => setLocale(event.target.value)}
            />
            <datalist id="account-locales">
              {options.locales.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </label>
        </div>

        <p className="muted-text" style={{ margin: 0, fontSize: 13 }}>
          Your time zone decides when program days unlock for you and how every date on your report is shown.
        </p>

        <div className="button-row">
          <button type="submit" className="button-primary" disabled={pending}>
            {pending ? "Saving…" : "Save details"}
          </button>
        </div>
        <StatusLine status={status} />
      </form>
    </SurfaceCard>
  );
}

function AccountFactsCard({
  account,
  memberSince
}: {
  account: AccountProfile;
  memberSince: string;
}): JSX.Element {
  return (
    <SurfaceCard title="Account">
      <dl className="account-facts">
        <div>
          <dt>Account type</dt>
          <dd>{account.accountType === "tenant_member" ? "School member" : "Individual"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{account.status}</dd>
        </div>
        <div>
          <dt>Connected sign-in</dt>
          <dd>{account.linkedProviders.length > 0 ? account.linkedProviders.join(", ") : "None"}</dd>
        </div>
        <div>
          <dt>Member since</dt>
          <dd>{memberSince}</dd>
        </div>
      </dl>
    </SurfaceCard>
  );
}
