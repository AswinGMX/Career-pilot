import { memo } from "react";
import { Link } from "react-router-dom";

import type { Career } from "@/features/dashboard/types";
import { buildAdminCareerDetailPath } from "@/routes/paths";
import { EmptyState } from "@/shared/components";
import { labelize } from "@/shared/utils";

interface AdminCareerLibraryProps {
  categories: string[];
  careers: Career[];
  category: string;
  search: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export const AdminCareerLibrary = memo(function AdminCareerLibrary({
  categories,
  careers,
  category,
  onCategoryChange,
  onSearchChange,
  search
}: AdminCareerLibraryProps): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px", marginBottom: "24px" }}>
          <div>
            <p style={{ color: "#6366f1", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 6px" }}>
              Career library
            </p>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              Browse the full career catalog
            </h1>
            <p style={{ color: "#64748b", fontSize: "14px", lineHeight: 1.6, margin: 0, maxWidth: "520px" }}>
              Search every available career path, then open a read-only admin detail page to inspect the full profile, salary progression,
              and day-to-day realities.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
            {[
              { n: careers.length, l: "Shown" },
              { n: categories.length, l: "Categories" }
            ].map((item) => (
              <div
                key={item.l}
                style={{
                  padding: "14px 20px",
                  background: "rgba(99,102,241,0.06)",
                  border: "1px solid rgba(99,102,241,0.15)",
                  borderRadius: "12px",
                  textAlign: "center",
                  minWidth: "90px"
                }}
              >
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#4f46e5" }}>{item.n}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{item.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "12px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 600,
                color: "#94a3b8",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "6px"
              }}
            >
              Search
            </label>
            <input
              value={search}
              placeholder="🔍  Search careers, e.g. Engineer, Doctor..."
              onChange={(event) => onSearchChange(event.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                fontSize: "14px",
                color: "#0f172a",
                outline: "none",
                background: "#f8fafc",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 600,
                color: "#94a3b8",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "6px"
              }}
            >
              Category
            </label>
            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                fontSize: "14px",
                color: "#0f172a",
                outline: "none",
                background: "#f8fafc",
                fontFamily: "inherit"
              }}
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px 32px" }}>
        <div style={{ marginBottom: "20px" }}>
          <p style={{ color: "#6366f1", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 4px" }}>
            {careers.length} careers shown
          </p>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Career cards</h2>
        </div>

        {careers.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", alignItems: "stretch" }}>
            {careers.map((career) => (
              <Link
                key={career.id}
                to={buildAdminCareerDetailPath(career.id)}
                style={{
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  padding: "20px",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
                  color: "inherit",
                  height: "100%",
                  boxSizing: "border-box"
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = "#a5b4fc";
                  event.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.1)";
                  event.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = "#e2e8f0";
                  event.currentTarget.style.boxShadow = "none";
                  event.currentTarget.style.transform = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "#6366f1", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 4px" }}>
                      {career.category}
                    </p>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>{career.title}</h3>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 9px",
                      borderRadius: "999px",
                      background: "rgba(99,102,241,0.08)",
                      border: "1px solid rgba(99,102,241,0.2)",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#6366f1",
                      flexShrink: 0
                    }}
                  >
                    {career.futureOutlook.demandScore}% demand
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    lineHeight: 1.55,
                    margin: 0,
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                    flex: 1
                  }}
                >
                  {career.summary}
                </p>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {(career.interestTags.length ? career.interestTags : career.demandTags).slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: "rgba(99,102,241,0.06)",
                          border: "1px solid rgba(99,102,241,0.12)",
                          fontSize: "11px",
                          color: "#6366f1",
                          fontWeight: 500
                        }}
                      >
                        {labelize(tag)}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: "12px", color: "#6366f1", fontWeight: 600 }}>View →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No careers match this filter"
            description="Try a different keyword or clear the category to browse more career paths."
          />
        )}
      </div>
    </div>
  );
});
