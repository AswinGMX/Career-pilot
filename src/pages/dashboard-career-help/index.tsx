import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { routePaths } from "@/routes/paths";
import { Card } from "@/shared/components";

function decodeCareerName(value: string | null): string {
  if (!value) {
    return "your selected career";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function DashboardCareerHelpPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const score = Number(searchParams.get("score") || 0);
  const career = decodeCareerName(searchParams.get("career"));
  const category = searchParams.get("category") || "";
  const isTechnology =
    category.trim().toLowerCase() === "technology" || (!category && searchParams.get("technology") === "1");
  const isBelowPar = score < 65;
  const isMentorPath = !isTechnology;

  const headline = useMemo(() => {
    if (isMentorPath && isBelowPar) {
      return `Next step: rebuild your ${career} path with mentor guidance`;
    }

    if (isMentorPath) {
      return `Next step: move forward in ${career} with an in-person mentor`;
    }

    if (isBelowPar) {
      return `We can strengthen your path toward ${career}`;
    }

    return `Next step: turn your ${career} momentum into placements`;
  }, [career, isBelowPar, isMentorPath]);

  const summary = isMentorPath
    ? isBelowPar
      ? "This path needs real-world guidance first. Work with a mentor, build discipline in live settings, and then return with stronger proof."
      : "This path grows faster through in-person guidance, field exposure, and someone experienced helping you take the next right step."
    : isBelowPar
      ? "This is the support layer. Start by building stronger real-world signals, then come back with better proof."
      : "This is the acceleration layer. Build verified signals and sharper visibility before targeting top companies.";

  return (
    <div className="career-help-page">
      <div className="career-help-orb career-help-orb--one" aria-hidden="true" />
      <div className="career-help-orb career-help-orb--two" aria-hidden="true" />

      <Card className="career-help-hero">
        <p className="eyebrow">Career help</p>
        <h1>{headline}</h1>
        <p>{summary}</p>
        <div className="actions">
          <span className={`pill ${isBelowPar ? "pill--danger" : "pill--success"}`}>Current score {score}%</span>
          {isTechnology ? <span className="pill">Technology pathway unlocked</span> : <span className="pill">Mentor pathway unlocked</span>}
        </div>
      </Card>

      <section className="career-help-center">
        {isMentorPath ? (
          <div className="career-help-logo-grid">
            <article className="career-help-logo-card">
              <div className="career-help-logo-mark career-help-logo-mark--mentor">M</div>
              <strong>In-person mentor</strong>
              <p>
                {isBelowPar
                  ? `You need a mentor who can guide your next ${career} step in a realistic environment.`
                  : `The best next move is an in-person mentor who can guide your growth in ${career}.`}
              </p>
            </article>
            <article className="career-help-logo-card">
              <div className="career-help-logo-mark career-help-logo-mark--field">R</div>
              <strong>Real-world exposure</strong>
              <p>
                {isBelowPar
                  ? "Shadow the role, observe the work reality, and build readiness before the next proof attempt."
                  : "Use shadowing, live observation, and guided practice to convert readiness into consistent action."}
              </p>
            </article>
          </div>
        ) : isBelowPar ? (
          <div className="career-help-logo-grid">
            <a className="career-help-logo-card" href="https://digri.ai/" rel="noreferrer" target="_blank">
              <img
                alt="Digri"
                className="career-help-logo-image"
                src="https://digri.ai/wp-content/uploads/2023/08/digri-favicon-1.png"
              />
              <strong>Digri</strong>
              <p>Upskill your technology foundation.</p>
            </a>
            <a className="career-help-logo-card" href="https://www.veril.ai/" rel="noreferrer" target="_blank">
              <img alt="Veril AI" className="career-help-logo-image" src="https://www.veril.ai/logo.png" />
              <strong>Veril AI</strong>
              <p>Verify skills and strengthen resume proof.</p>
            </a>
          </div>
        ) : isTechnology ? (
          <div className="career-help-logo-grid">
            <a className="career-help-logo-card" href="https://digri.ai/" rel="noreferrer" target="_blank">
              <img
                alt="Digri"
                className="career-help-logo-image"
                src="https://digri.ai/wp-content/uploads/2023/08/digri-favicon-1.png"
              />
              <strong>Digri</strong>
              <p>Level up and stay sharp for technology roles.</p>
            </a>
            <a className="career-help-logo-card" href="https://www.veril.ai/" rel="noreferrer" target="_blank">
              <img alt="Veril AI" className="career-help-logo-image" src="https://www.veril.ai/logo.png" />
              <strong>Veril AI</strong>
              <p>Show verified skill proof before placement outreach.</p>
            </a>
          </div>
        ) : null}
      </section>

      <div className="actions career-help-actions">
        <Link className="button button--secondary" to={routePaths.dashboardProof}>
          Back to proof center
        </Link>
      </div>
    </div>
  );
}
