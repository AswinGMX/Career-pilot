import type { ReactNode } from "react";

import {
  BarChartIcon,
  BrainIcon,
  BriefcaseIcon,
  BuildingIcon,
  GraduationIcon,
  HeartIcon,
  RocketIcon,
  RouteIcon,
  ShieldIcon,
  SparkleIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersIcon
} from "./icons";

/* ── Left brand panel ── */

const FEATURES = [
  { icon: <TargetIcon size={18} />, title: "AI Career Matching", desc: "Smart recommendations based on your strengths" },
  { icon: <RouteIcon size={18} />, title: "Personalized Roadmap", desc: "Step-by-step guidance for your future" },
  { icon: <BuildingIcon size={18} />, title: "School Integration", desc: "Seamless tools for schools and counselors" },
  { icon: <TrendingUpIcon size={18} />, title: "Progress Tracking", desc: "Track skills, goals and achievements" }
];

const STATS = [
  { icon: <GraduationIcon size={17} />, value: "165+", label: "Career Paths Available" },
  { icon: <UsersIcon size={17} />, value: "2,000+", label: "Students Guided" },
  { icon: <BuildingIcon size={17} />, value: "50+", label: "Schools Partnered" },
  { icon: <HeartIcon size={17} />, value: "95%", label: "Student Satisfaction" }
];

const SCHOOLS = [
  { name: "Greenfield", type: "International School" },
  { name: "Maplewood", type: "High School" },
  { name: "Bright Future", type: "Academy" },
  { name: "Riverside", type: "Public School" },
  { name: "Oakridge", type: "International School" }
];

function DashboardMockup(): JSX.Element {
  return (
    <div className="cp-mock" aria-hidden>
      <aside className="cp-mock-side">
        <div className="cp-mock-side-title">Dashboard</div>
        <div className="cp-mock-nav cp-mock-nav--active">Overview</div>
        <div className="cp-mock-nav">Career Match</div>
        <div className="cp-mock-nav">Roadmap</div>
        <div className="cp-mock-nav">Skills</div>
        <div className="cp-mock-nav">Assessments</div>
        <div className="cp-mock-nav">Progress</div>
        <div className="cp-mock-nav">Resources</div>
      </aside>
      <div className="cp-mock-main">
        <div className="cp-mock-row cp-mock-head">
          <div>
            <div className="cp-mock-h1">Hi, Priya 👋</div>
            <div className="cp-mock-sub">Let&rsquo;s build your future together.</div>
          </div>
          <div className="cp-mock-match">
            <div>
              <div className="cp-mock-match-val">92% Match</div>
              <div className="cp-mock-sub">Overall Match Score</div>
            </div>
            <span className="cp-mock-ring" />
          </div>
        </div>

        <div className="cp-mock-card">
          <div className="cp-mock-row cp-mock-card-head">
            <div>
              <div className="cp-mock-h2">Top Career Matches</div>
              <div className="cp-mock-sub">Based on your interests, skills and personality</div>
            </div>
            <span className="cp-mock-link">View All</span>
          </div>
          <div className="cp-mock-matches">
            <div className="cp-mock-match-tile cp-mock-match-tile--green">
              <span className="cp-mock-tile-icon"><BarChartIcon size={15} /></span>
              <div className="cp-mock-tile-name">Data Scientist</div>
              <div className="cp-mock-tile-pct">92% Match</div>
            </div>
            <div className="cp-mock-match-tile cp-mock-match-tile--violet">
              <span className="cp-mock-tile-icon"><BrainIcon size={15} /></span>
              <div className="cp-mock-tile-name">AI / ML Engineer</div>
              <div className="cp-mock-tile-pct">88% Match</div>
            </div>
            <div className="cp-mock-match-tile cp-mock-match-tile--blue">
              <span className="cp-mock-tile-icon"><BriefcaseIcon size={15} /></span>
              <div className="cp-mock-tile-name">Product Manager</div>
              <div className="cp-mock-tile-pct">85% Match</div>
            </div>
          </div>
        </div>

        <div className="cp-mock-card">
          <div className="cp-mock-row cp-mock-card-head">
            <div>
              <div className="cp-mock-h2">Your Career Roadmap</div>
              <div className="cp-mock-sub">Next steps to achieving your goals</div>
            </div>
            <span className="cp-mock-link">View Full Roadmap ›</span>
          </div>
          <div className="cp-mock-steps">
            {[
              { n: "01", t: "Assess", d: "Discover your strengths", c: "#22c55e" },
              { n: "02", t: "Learn", d: "Build relevant skills", c: "#a855f7" },
              { n: "03", t: "Practice", d: "Gain real world experience", c: "#f59e0b" },
              { n: "04", t: "Achieve", d: "Land your dream career", c: "#38bdf8" }
            ].map((s) => (
              <div key={s.n} className="cp-mock-step">
                <span className="cp-mock-step-dot" style={{ background: s.c }}>{s.n}</span>
                <div className="cp-mock-step-t">{s.t}</div>
                <div className="cp-mock-sub">{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="cp-mock-card">
          <div className="cp-mock-row cp-mock-card-head">
            <div>
              <div className="cp-mock-h2">Skills Progress</div>
              <div className="cp-mock-sub">Your top skills and growth</div>
            </div>
            <span className="cp-mock-link">View All</span>
          </div>
          <div className="cp-mock-skills">
            {[
              { n: "Data Analysis", p: 90, c: "#22c55e" },
              { n: "Python", p: 85, c: "#a855f7" },
              { n: "Problem Solving", p: 88, c: "#38bdf8" }
            ].map((sk) => (
              <div key={sk.n} className="cp-mock-skill">
                <div className="cp-mock-skill-top">
                  <span>{sk.n}</span>
                  <span>{sk.p}%</span>
                </div>
                <div className="cp-mock-bar">
                  <span style={{ width: `${sk.p}%`, background: sk.c }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LeftContent(): JSX.Element {
  return (
    <>
      <div className="lc-top">
        <div className="lc-text">
      <div className="landing-brand">
        <div className="landing-brand-icon"><RocketIcon size={20} /></div>
        <div className="landing-brand-text">
          <h1>Career Pilot</h1>
          <span>AI Career Platform</span>
        </div>
      </div>

      <div className="landing-badge"><SparkleIcon size={13} /> 165+ Career Paths Available</div>

      <h2 className="landing-headline">
        Experience the career<br />
        before you <span>choose.</span>
      </h2>

      <p className="landing-description">
        AI-powered career intelligence platform helping students make confident academic and professional decisions.
      </p>

      <div className="landing-features">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="landing-feature-card">
            <span className="landing-feature-tile">{feature.icon}</span>
            <div>
              <div className="landing-feature-title">{feature.title}</div>
              <div className="landing-feature-desc">{feature.desc}</div>
            </div>
          </div>
        ))}
      </div>
        </div>

        <DashboardMockup />
      </div>

      <div className="lc-bottom">
      <div className="landing-stats">
        {STATS.map((stat) => (
          <div key={stat.label} className="landing-stat">
            <span className="landing-stat-icon">{stat.icon}</span>
            <div className="landing-stat-value">{stat.value}</div>
            <div className="landing-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="landing-logos">
        <p className="landing-logos-title">Trusted by 50+ schools</p>
        <div className="landing-logos-row">
          {SCHOOLS.map((school) => (
            <div key={school.name} className="landing-logo">
              <span className="landing-logo-crest"><ShieldIcon size={18} /></span>
              <div>
                <div className="landing-logo-name">{school.name}</div>
                <div className="landing-logo-type">{school.type}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </>
  );
}

/* ── Landing page hero (public root) ── */

export function LandingHero({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="landing-page landing-page--hero">
      <div className="landing-grid">
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
    </div>
  );
}

/* ── Auth pages (login / register / forgot / reset) ── */

export function LandingLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="landing-page">
      <div className="landing-grid">
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
    </div>
  );
}
