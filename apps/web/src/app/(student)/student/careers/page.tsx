import Link from "next/link";

import { getCareerCategories, getCareers } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { requireStudent } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CareersPage({
  searchParams
}: {
  searchParams?: { q?: string; category?: string };
}): Promise<JSX.Element> {
  await requireStudent();

  const query = searchParams?.q || "";
  const category = searchParams?.category || "";
  const [careers, categories] = await Promise.all([
    getCareers({ q: query, category, page: 1, pageSize: 24 }),
    getCareerCategories()
  ]);

  return (
    <AppPage>
      <Hero
        eyebrow="Student"
        title="Career catalog"
        subtitle={<p style={{ margin: 0 }}>Explore the managed career library backed by relational data and stable APIs.</p>}
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
          Showing {careers.items.length} of {careers.total} careers.
        </p>

        <div className="panel-grid panel-grid--cards">
          {careers.items.map((career) => (
            <SurfaceCard key={career.id}>
              <p className="app-eyebrow">{career.category.name}</p>
              <h2 style={{ margin: "10px 0 8px", fontSize: "1.4rem", lineHeight: 1.1 }}>{career.title}</h2>
              <p className="muted-text" style={{ margin: 0 }}>{career.summary}</p>
              <p className="muted-text" style={{ marginTop: "12px" }}>
                Skills: {career.skills.slice(0, 3).join(", ") || "Not available"}
              </p>
              <p style={{ marginTop: "12px" }}>
                <Link href={`/student/careers/${career.slug}`}>Open detail</Link>
              </p>
            </SurfaceCard>
          ))}
        </div>
      </div>
    </AppPage>
  );
}
