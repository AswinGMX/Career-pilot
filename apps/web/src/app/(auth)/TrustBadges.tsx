import { GlobeIcon, LockIcon, ShieldIcon } from "@/components/icons";

/** Security/compliance reassurance row shown under the auth form. */
export function TrustBadges(): JSX.Element {
  return (
    <div className="cp-trust">
      <p className="cp-trust-title">
        <ShieldIcon size={14} /> Your data is safe and secure
      </p>
      <div className="cp-trust-row">
        <div className="cp-trust-badge">
          <span className="cp-trust-icon"><ShieldIcon size={16} /></span>
          <strong>SOC 2</strong>
          <span>Compliant</span>
        </div>
        <div className="cp-trust-badge">
          <span className="cp-trust-icon"><GlobeIcon size={16} /></span>
          <strong>GDPR</strong>
          <span>Ready</span>
        </div>
        <div className="cp-trust-badge">
          <span className="cp-trust-icon"><LockIcon size={16} /></span>
          <strong>256-bit</strong>
          <span>Encrypted</span>
        </div>
      </div>
    </div>
  );
}
