import Link from "next/link";
import { Fragment } from "react";

import { JourneyDialog } from "./journey-report-info";

type StepState = "done" | "active" | "pending";

export interface JourneyStepperProps {
  profileStatus: "missing" | "draft" | "submitted";
  recsCount: number;
  proofsCompleted: number;
  reportReady: boolean;
}

interface Step {
  href: string;
  label: string;
  state: StepState;
  status: string;
  description: string;
}

function deriveSteps({ profileStatus, recsCount, proofsCompleted, reportReady }: JourneyStepperProps): Step[] {
  const profileDone = profileStatus === "submitted";
  const recsDone = recsCount > 0;
  const proofsDone = proofsCompleted > 0;
  const reportDone = reportReady;

  const firstPending =
    !profileDone ? 0 : !recsDone ? 1 : !proofsDone ? 2 : !reportDone ? 3 : -1;

  const steps: Omit<Step, "state">[] = [
    {
      href: "/student/profile",
      label: "Profile",
      status:
        profileStatus === "submitted"
          ? "Submitted"
          : profileStatus === "draft"
          ? "Draft — continue"
          : "Not started",
      description:
        "The signals everything else is built on — favourite subjects, activities, curiosity topics, and strengths."
    },
    {
      href: "/student/recommendations",
      label: "Recommendations",
      status: recsCount > 0 ? `${recsCount} match${recsCount === 1 ? "" : "es"}` : "Generate matches",
      description: "AI-ranked career matches with fit scores, derived directly from your profile."
    },
    {
      href: "/student/proof-sessions",
      label: "Proof sessions",
      status:
        proofsCompleted > 0
          ? `${proofsCompleted} completed`
          : recsDone
          ? "Start a session"
          : "Waiting on matches",
      description: "Short scenario-based sessions that turn interest into proven, real-world readiness."
    },
    {
      href: "/student/report",
      label: "Report",
      status: reportReady ? "Ready to share" : proofsDone ? "Generate report" : "Waiting on proof",
      description: "A durable, shareable summary of your profile, matches, and proof evidence."
    }
  ];

  return steps.map((step, index) => {
    const done = [profileDone, recsDone, proofsDone, reportDone][index];
    const active = index === firstPending;
    return { ...step, state: done ? "done" : active ? "active" : "pending" };
  });
}

export function JourneyStepper(props: JourneyStepperProps): JSX.Element {
  const steps = deriveSteps(props);

  return (
    <nav className="journey-stepper" aria-label="Career discovery journey">
      <JourneyDialog
        steps={steps.map((step) => ({
          label: step.label,
          status: step.status,
          state: step.state,
          href: step.href,
          description: step.description
        }))}
      />
      {steps.map((step, index) => (
        <Fragment key={step.href}>
          <Link className={`journey-step journey-step--${step.state}`} href={step.href}>
            <span className="journey-step__bullet" aria-hidden="true">
              {step.state === "done" ? "✓" : index + 1}
            </span>
            <span className="journey-step__text">
              <span className="journey-step__label">{step.label}</span>
              <span className="journey-step__status">{step.status}</span>
            </span>
          </Link>
          {index < steps.length - 1 ? (
            <span
              className={`journey-step__connector ${step.state === "done" ? "journey-step__connector--done" : ""}`}
              aria-hidden="true"
            />
          ) : null}
        </Fragment>
      ))}
    </nav>
  );
}
