"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { CareerCategorySummary } from "@career-pilot/types";

import { SearchIcon } from "@/components/icons";

const SEARCH_DEBOUNCE_MS = 400;

export function CareerSearchForm({
  initialQuery,
  initialCategory,
  categories
}: {
  initialQuery: string;
  initialCategory: string;
  categories: CareerCategorySummary[];
}): JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const skipNextDebounce = useRef(true);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (skipNextDebounce.current) {
      skipNextDebounce.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigate(query, initialCategory);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
    // Only the search text should be debounced; category changes navigate immediately below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function navigate(nextQuery: string, nextCategory: string): void {
    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    if (nextCategory) params.set("category", nextCategory);
    const search = params.toString();
    router.replace(search ? `/student/careers?${search}` : "/student/careers", { scroll: false });
  }

  return (
    <div className="surface-card" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
      <div style={{ position: "relative", flex: "1 1 240px", minWidth: "240px" }}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search careers"
          className="field-control"
          style={{ width: "100%", paddingRight: "42px" }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            right: "14px",
            transform: "translateY(-50%)",
            display: "flex",
            color: "var(--muted-strong)",
            pointerEvents: "none"
          }}
        >
          <SearchIcon size={18} />
        </span>
      </div>
      <select
        value={initialCategory}
        onChange={(event) => navigate(query, event.target.value)}
        className="field-control"
        style={{ minWidth: "220px" }}
      >
        <option value="">All categories</option>
        {categories.map((item) => (
          <option key={item.id} value={item.slug}>
            {item.name} ({item.count})
          </option>
        ))}
      </select>
    </div>
  );
}
