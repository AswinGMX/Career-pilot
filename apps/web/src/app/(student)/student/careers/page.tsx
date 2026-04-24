import Link from "next/link";

import { getCareerCategories, getCareers, getLatestRecommendations } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function CareersPage({
  searchParams
}: {
  searchParams?: { q?: string; category?: string; page?: string };
}): Promise<JSX.Element> {
  await requireStudent();
  const cookieHeader = getServerSessionCookieHeader();

  const query = searchParams?.q || "";
  const category = searchParams?.category || "";
  const requestedPage = Number(searchParams?.page || "1");
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

  const [careers, categories, recsResponse] = await Promise.all([
    getCareers({ q: query, category, page, pageSize: PAGE_SIZE }),
    getCareerCategories(),
    getLatestRecommendations(cookieHeader)
  ]);

  const totalPages = Math.max(1, Math.ceil(careers.total / careers.pageSize));
  const currentPage = Math.min(Math.max(careers.page, 1), totalPages);
  const startIndex = careers.total === 0 ? 0 : (currentPage - 1) * careers.pageSize + 1;
  const endIndex = Math.min(currentPage * careers.pageSize, careers.total);

  const matchBySlug = new Map(
    (recsResponse.snapshot?.items ?? []).map((item) => [item.career.slug, item])
  );

  const buildPageHref = (targetPage: number): string => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (targetPage > 1) params.set("page", String(targetPage));
    const search = params.toString();
    return search ? `/student/careers?${search}` : "/student/careers";
  };

  return (
    <AppPage>
      <Hero
        eyebrow="Student"
        title="Career catalog"
        subtitle={
          <p style={{ margin: 0 }}>
            Explore the managed career library. Careers from your latest recommendation snapshot are tagged with a
            match badge.
          </p>
        }
      />

      <div className="section-stack">
        <form method="GET" className="surface-card" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <input
            name="q"
            defaultValue={query}
            placeholder="Search careers"
            className="field-control"
            style={{ minWidth: "240px" }}
          />
          <select
            name="category"
            defaultValue={category}
            className="field-control"
            style={{ minWidth: "220px" }}
          >
            <option value="">All categories</option>
            {categories.categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name} ({item.count})
              </option>
            ))}
          </select>
          <button type="submit" className="button-primary">
            Search
          </button>
        </form>

        <p className="muted-text" style={{ margin: 0 }}>
          {careers.total === 0
            ? "No careers match your filters."
            : `Showing ${startIndex}–${endIndex} of ${careers.total} careers · Page ${currentPage} of ${totalPages}`}
        </p>

        <div className="panel-grid panel-grid--cards">
          {careers.items.map((career) => {
            const match = matchBySlug.get(career.slug);
            return (
              <SurfaceCard key={career.id}>
                <div className="match-badge-row">
                  <span className="app-eyebrow" style={{ margin: 0 }}>
                    {career.category.name}
                  </span>
                  {match ? (
                    <span className={`fit-badge fit-badge--${match.fitLabel}`}>
                      Match #{match.rank} · {match.fitScore}
                    </span>
                  ) : null}
                </div>
                <h2 style={{ margin: "6px 0 8px", fontSize: "1.4rem", lineHeight: 1.1 }}>{career.title}</h2>
                <p className="muted-text" style={{ margin: 0 }}>{career.summary}</p>
                <p className="muted-text" style={{ marginTop: "12px" }}>
                  Skills: {career.skills.slice(0, 3).join(", ") || "Not available"}
                </p>
                <p style={{ marginTop: "12px", marginBottom: 0, fontSize: 14 }}>
                  <Link href={`/student/careers/${career.slug}`}>Open detail →</Link>
                  {match ? (
                    <>
                      {" · "}
                      <Link href={`/student/recommendations/${career.slug}`}>Match reasoning</Link>
                    </>
                  ) : null}
                </p>
              </SurfaceCard>
            );
          })}
        </div>

        {totalPages > 1 ? (
          <nav className="pagination" aria-label="Careers pagination">
            {currentPage > 1 ? (
              <Link className="pagination__link" href={buildPageHref(currentPage - 1)} aria-label="Previous page">
                ← Previous
              </Link>
            ) : (
              <span className="pagination__link pagination__link--disabled" aria-disabled="true">
                ← Previous
              </span>
            )}

            <div className="pagination__pages">
              {buildPageList(currentPage, totalPages).map((entry, index) =>
                entry === "…" ? (
                  <span key={`gap-${index}`} className="pagination__gap" aria-hidden="true">
                    …
                  </span>
                ) : entry === currentPage ? (
                  <span key={entry} className="pagination__page pagination__page--current" aria-current="page">
                    {entry}
                  </span>
                ) : (
                  <Link key={entry} className="pagination__page" href={buildPageHref(entry)}>
                    {entry}
                  </Link>
                )
              )}
            </div>

            {currentPage < totalPages ? (
              <Link className="pagination__link" href={buildPageHref(currentPage + 1)} aria-label="Next page">
                Next →
              </Link>
            ) : (
              <span className="pagination__link pagination__link--disabled" aria-disabled="true">
                Next →
              </span>
            )}
          </nav>
        ) : null}
      </div>
    </AppPage>
  );
}

function buildPageList(current: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");

  pages.push(total);
  return pages;
}
