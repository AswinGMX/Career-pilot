"use client";

import Link from "next/link";
import { useState } from "react";

import type { ProfileAssessmentResult, StudentProfile } from "@career-pilot/types";

import { Hero } from "@/components/page-chrome";

import { ProfileForm } from "./ProfileForm";

export function ProfileStudio({
  initialProfile,
  studentName,
  initialAssessmentResult
}: {
  initialProfile: StudentProfile | null;
  studentName: string;
  initialAssessmentResult: ProfileAssessmentResult | null;
}): JSX.Element {
  const isCompleted = initialProfile?.completionStatus === "submitted";
  const hasAssessment = Boolean(initialAssessmentResult);
  const canToggle = isCompleted || hasAssessment;
  const [showForm, setShowForm] = useState<boolean>(!canToggle);

  return (
    <>
      <Hero
        eyebrow="AI Profile Studio"
        title="Build the student character profile"
        subtitle={
          <p style={{ margin: 0 }}>
            Your profile details and assessment are saved. The detailed personality analysis is shown below.
          </p>
        }
        actions={
          <>
            {isCompleted ? (
              <span
                className="status-chip"
                style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a", fontWeight: 600 }}
              >
                Profile completed
              </span>
            ) : null}
            {canToggle ? (
              <button
                type="button"
                className={showForm ? "button-secondary" : "button-primary"}
                onClick={() => setShowForm((prev) => !prev)}
              >
                {showForm ? "Hide form" : "Edit profile"}
              </button>
            ) : null}
            <Link className="button-secondary" href="/student/dashboard">
              Back to dashboard
            </Link>
          </>
        }
      />
      <div className="section-stack">
        <ProfileForm
          initialProfile={initialProfile}
          studentName={studentName}
          initialAssessmentResult={initialAssessmentResult}
          isEditingControlled={canToggle ? showForm : undefined}
          onEditingChange={canToggle ? setShowForm : undefined}
        />
      </div>
    </>
  );
}
