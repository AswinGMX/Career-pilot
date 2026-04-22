import type { ReactNode } from "react";
import { LandingIllustration } from "./landing-illustration";

/* ── Shared left-side content ── */

function LeftContent(): JSX.Element {
  return (
    <>
      <div className="landing-brand">
        <div className="landing-brand-icon">🚀</div>
        <div className="landing-brand-text">
          <h1>Career Pilot</h1>
          <span>AI Career Platform</span>
        </div>
      </div>

      <div className="landing-badge">165+ Career Paths Available</div>

      <h2 className="landing-headline">
        Find your path.<br />
        <span>Build your future.</span>
      </h2>

      <p className="landing-description">
        AI-powered career guidance for students and schools.
      </p>

      <div className="landing-features">
        <div className="landing-feature-pill">
          <span className="feat-icon">🤖</span> AI Career Matching
        </div>
        <div className="landing-feature-pill">
          <span className="feat-icon">📊</span> Personalized Roadmap
        </div>
        <div className="landing-feature-pill">
          <span className="feat-icon">🏫</span> School Integration
        </div>
        <div className="landing-feature-pill">
          <span className="feat-icon">📈</span> Progress Tracking
        </div>
      </div>

      <div className="landing-illustration">
        <LandingIllustration />
      </div>

      <div className="landing-stats">
        <div className="landing-stat">
          <span className="landing-stat-icon">📊</span>
          <div className="landing-stat-value">165+</div>
          <div className="landing-stat-label">Career Paths</div>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-icon">🎓</span>
          <div className="landing-stat-value">2K+</div>
          <div className="landing-stat-label">Students</div>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-icon">🏫</span>
          <div className="landing-stat-value">50+</div>
          <div className="landing-stat-label">Schools</div>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-icon">✨</span>
          <div className="landing-stat-value">100%</div>
          <div className="landing-stat-label">Free</div>
        </div>
      </div>

      <div className="landing-testimonial">
        <p className="landing-testimonial-text">
          💬 &ldquo;Career Pilot helped me discover my passion and land my dream internship!&rdquo;
        </p>
        <p className="landing-testimonial-author">
          — Priya S., Computer Science Student
        </p>
      </div>
    </>
  );
}

function FloatingIcons(): JSX.Element {
  return (
    <div className="landing-floating-icons">
      <div className="floating-icon fi-purple">💼</div>
      <div className="floating-icon fi-indigo">✏️</div>
      <div className="floating-icon fi-violet">🏆</div>
      <div className="floating-icon fi-purple">💡</div>
      <div className="floating-icon fi-indigo">📋</div>
      <div className="floating-icon fi-gold">⭐</div>
      <div className="floating-icon fi-violet">🎯</div>
      <div className="floating-icon fi-purple">🔧</div>
      <div className="floating-icon fi-gold">📚</div>
      <div className="floating-icon fi-indigo">🏅</div>
    </div>
  );
}

/* ── Landing page: 70/30 with CTA card on right ── */

export function LandingHero({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="landing-page landing-page--hero">
      <FloatingIcons />
      <div className="landing-left">
        <div className="landing-left-content">
          <LeftContent />
        </div>
      </div>
      <div className="landing-hero-right">
        <div className="landing-hero-cta-card">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Auth pages: 70/30 with form card on right ── */

export function LandingLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="landing-page">
      <FloatingIcons />
      <div className="landing-left">
        <div className="landing-left-content">
          <LeftContent />
        </div>
      </div>
      <div className="landing-right">
        <div className="landing-form-card">
          {children}
        </div>
      </div>
    </div>
  );
}
