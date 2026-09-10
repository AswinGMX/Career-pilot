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
          </>
        }
      />
      <div className="section-stack">
        <ProfileForm
          initialProfile={initialProfile}
          studentName={studentName}
          initialAssessmentResult={initialAssessmentResult}
          isEditingControlled={showForm}
          onEditingChange={setShowForm}
        />
      </div>
    </>
  );
}
