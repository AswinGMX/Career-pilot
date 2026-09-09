import Link from "next/link";

import { getCareerCategories, getCareers, getLatestRecommendations } from "@/lib/api";
import { AppPage, Hero } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Pathfinder — the single sidebar entry for choosing a career.
 *
 * It is a fork in the road, not a dashboard: two doors, one for each way a
 * student arrives. "I don't know what I want" leads to the ranked matches;
 * "I already have one in mind" leads to the catalog. Each door opens its own
 * full page rather than a cramped panel, so neither view has to be shrunk to
 * fit beside the other.
 *
 * The cards carry live counts because a door with a number on it tells you
 * whether it is worth opening.
 */
export default async function PathfinderPage(): Promise<JSX.Element> {
  await requireStudent();
  const cookieHeader = getServerSessionCookieHeader();

  // One career is enough to read `total`; the catalog page fetches the rest.
  const [recsResponse, careers, categories] = await Promise.all([
    getLatestRecommendations(cookieHeader),
    getCareers({ page: 1, pageSize: 1 }),
    getCareerCategories()
  ]);

  const snapshot = recsResponse.snapshot;
  const matchCount = snapshot?.items.length ?? 0;
  const topMatch = snapshot?.items[0] ?? null;

  return (
    <AppPage>
      <Hero
        eyebrow="Pathfinder"
        title="Find your direction"
        subtitle={
          <p style={{ margin: 0 }}>
            Start from what your profile suggests, or go straight to a career you already have in mind.
          </p>
        }
      />

      <div className="pathfinder-doors">
        <Link href="/student/recommendations" className="pathfinder-door">
          <span className="pathfinder-door-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3.2l2.3 6L20.5 11l-6.2 1.8L12 19l-2.3-6.2L3.5 11l6.2-1.8z" />
            </svg>
          </span>

          <span className="pathfinder-door-body">
            <span className="pathfinder-door-title">Recommendations</span>
            <span className="pathfinder-door-desc">
              Careers ranked against your profile, each with the evidence behind its score.
            </span>

            <span className="pathfinder-door-stat">
              {matchCount > 0 ? (
                <>
                  <strong>{matchCount}</strong> {matchCount === 1 ? "match" : "matches"}
                  {topMatch ? (
                    <>
                      {" · top pick "}
                      <strong>{topMatch.career.title}</strong> at {topMatch.fitScore}
                    </>
                  ) : null}
                </>
              ) : (
                "No matches yet — complete your profile to generate them"
              )}
            </span>
          </span>

          <span className="pathfinder-door-cta" aria-hidden>
            {matchCount > 0 ? "Open matches" : "Get started"} →
          </span>
        </Link>

        <Link href="/student/careers" className="pathfinder-door pathfinder-door--careers">
          <span className="pathfinder-door-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7.5" width="18" height="12.5" rx="2.4" />
              <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
              <path d="M3 12.5h18" />
            </svg>
          </span>

          <span className="pathfinder-door-body">
            <span className="pathfinder-door-title">Careers</span>
            <span className="pathfinder-door-desc">
              The full library — search it, filter by field, and open any career in depth.
            </span>

            <span className="pathfinder-door-stat">
              <strong>{careers.total}</strong> careers across <strong>{categories.categories.length}</strong> fields
            </span>
          </span>

          <span className="pathfinder-door-cta" aria-hidden>
            Browse catalog →
          </span>
        </Link>
      </div>
    </AppPage>
  );
}
