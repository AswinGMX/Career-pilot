import type { ReactNode } from "react";

type IconProps = { size?: number; className?: string };

/** Shared line-icon wrapper: inherits color via currentColor, rounded strokes. */
function S({ size = 18, className, children }: IconProps & { children: ReactNode }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const RocketIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </S>
);

export const SparkleIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
  </S>
);

export const TargetIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
  </S>
);

export const RouteIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <circle cx="6" cy="19" r="2.5" />
    <circle cx="18" cy="5" r="2.5" />
    <path d="M8.5 19H14a4 4 0 0 0 0-8H9.5a4 4 0 0 1 0-8H15.5" />
  </S>
);

export const BuildingIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
  </S>
);

export const TrendingUpIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M17 7h4v4" />
  </S>
);

export const GraduationIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M22 10L12 5 2 10l10 5 10-5z" />
    <path d="M6 12v5c3 2 9 2 12 0v-5" />
  </S>
);

export const UsersIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </S>
);

export const HeartIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </S>
);

export const ShieldIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" />
  </S>
);

export const MailIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 6l10 7L22 6" />
  </S>
);

export const LockIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </S>
);

export const UserIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </S>
);

export const TagIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M3 12l9-9 9 9-9 9z" />
    <circle cx="8.5" cy="8.5" r="1.2" />
  </S>
);

export const GlobeIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
  </S>
);

export const EyeIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </S>
);

export const EyeOffIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M9.9 5.2A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.5 9.5 0 0 0 4.1-.9" />
    <path d="M3 3l18 18" />
  </S>
);

export const CheckCircleIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </S>
);

export const XCircleIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </S>
);

export const SearchIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </S>
);

export const BrainIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M9 4a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 4 9c0 1 .5 1.8 1.2 2.3A2.6 2.6 0 0 0 5 13a2.5 2.5 0 0 0 2 2.45V18a2 2 0 0 0 2 2V4z" />
    <path d="M15 4a2.5 2.5 0 0 1 2.5 2.5A2.5 2.5 0 0 1 20 9c0 1-.5 1.8-1.2 2.3A2.6 2.6 0 0 1 19 13a2.5 2.5 0 0 1-2 2.45V18a2 2 0 0 1-2 2V4z" />
  </S>
);

export const BriefcaseIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 13h20" />
  </S>
);

export const BarChartIcon = (p: IconProps): JSX.Element => (
  <S {...p}>
    <path d="M3 21h18" />
    <path d="M7 21V10M12 21V4M17 21v-7" />
  </S>
);
