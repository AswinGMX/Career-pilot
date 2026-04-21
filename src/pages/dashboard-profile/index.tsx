import { useEffect, useState } from "react";

import { ProfileInsightCards, useProfileStudioPage } from "@/features/dashboard";
import { Button, Card, EmptyState, Field } from "@/shared/components";
import { ContentPageSkeleton } from "@/shared/components/Skeletons";
import { useUnsavedChangesPrompt } from "@/shared/hooks";
import { labelize } from "@/shared/utils";

const ageRangeOptions = ["10-12", "13-15", "16-18", "19-21"];
const gradeOptions = [
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Undergraduate",
  "Postgraduate"
];

export default function DashboardProfilePage(): JSX.Element {
  const {
    dashboard,
    formValues,
    generateQuestions,
    isDirty,
    isGeneratingQuestions,
    isLoading,
    isSubmittingProfile,
    questionSet,
    submitProfile,
    updateField
  } = useProfileStudioPage();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(true);

  useUnsavedChangesPrompt(isDirty, "You have unsaved profile changes. Do you really want to leave this page?");

  useEffect(() => {
    if (dashboard?.profile && !questionSet) {
      setIsEditorOpen(false);
    }
  }, [dashboard?.profile, questionSet]);

  if (isLoading) {
    return <ContentPageSkeleton />;
  }

  return (
    <div className="stack">
      <Card className={`stack profile-studio-card ${!isEditorOpen && !questionSet ? "profile-studio-card--collapsed" : ""}`}>
        <div className="card__header">
          <div>
            <p className="eyebrow">AI profile studio</p>
            <h1>Build the student character profile</h1>
          </div>
          {dashboard?.profile && !questionSet ? (
            <div className="actions">
              <span className="pill pill--success">Profile completed</span>
              <Button variant="secondary" onClick={() => setIsEditorOpen((current) => !current)}>
                {isEditorOpen ? "Hide form" : "Edit profile"}
              </Button>
            </div>
          ) : null}
        </div>
        {isEditorOpen || !dashboard?.profile || questionSet ? (
          <>
            <div className="profile-studio-intro">
              <p>
                Fill in the basics, then answer a short AI-generated question set to build the profile faster.
              </p>
              <span className="profile-studio-badge">Shorter form, quicker answers</span>
            </div>
            <div className="profile-form-grid profile-form-grid--top">
              <Field htmlFor="profile-age-range" label="Age range" className="profile-field">
                <select
                  id="profile-age-range"
                  className="input"
                  value={formValues.ageRange}
                  onChange={(event) => updateField("ageRange", event.target.value)}
                >
                  <option value="">Select age range</option>
                  {ageRangeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field htmlFor="profile-grade" label="Grade / stage" className="profile-field">
                <select
                  id="profile-grade"
                  className="input"
                  value={formValues.grade}
                  onChange={(event) => updateField("grade", event.target.value)}
                >
                  <option value="">Select grade / stage</option>
                  {gradeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field htmlFor="favorite-subjects" label="Favorite subjects" className="profile-field">
                <input
                  id="favorite-subjects"
                  className="input"
                  placeholder="Math, biology, history..."
                  value={formValues.favoriteSubjects}
                  onChange={(event) => updateField("favoriteSubjects", event.target.value)}
                />
              </Field>
            </div>
            <div className="profile-form-grid">
              <Field htmlFor="favorite-activities" label="Favorite activities" className="profile-field">
                <textarea
                  id="favorite-activities"
                  className="textarea profile-textarea"
                  rows={2}
                  placeholder="Sports, reading, design, building things..."
                  value={formValues.favoriteActivities}
                  onChange={(event) => updateField("favoriteActivities", event.target.value)}
                />
              </Field>
              <Field htmlFor="topics-curious-about" label="Topics you are curious about" className="profile-field">
                <textarea
                  id="topics-curious-about"
                  className="textarea profile-textarea"
                  rows={2}
                  placeholder="Space, business, machines, healthcare..."
                  value={formValues.topicsCuriousAbout}
                  onChange={(event) => updateField("topicsCuriousAbout", event.target.value)}
                />
              </Field>
              <Field htmlFor="personal-strengths" label="Current strengths" className="profile-field">
                <textarea
                  id="personal-strengths"
                  className="textarea profile-textarea"
                  rows={2}
                  placeholder="Calm under pressure, good with people..."
                  value={formValues.personalStrengths}
                  onChange={(event) => updateField("personalStrengths", event.target.value)}
                />
              </Field>
              <Field htmlFor="avoids-or-dislikes" label="Things you avoid or dislike" className="profile-field">
                <textarea
                  id="avoids-or-dislikes"
                  className="textarea profile-textarea"
                  rows={2}
                  placeholder="Crowded places, long theory work, repetitive tasks..."
                  value={formValues.avoidsOrDislikes}
                  onChange={(event) => updateField("avoidsOrDislikes", event.target.value)}
                />
              </Field>
            </div>
            <div className="actions">
              <Button
                aria-busy={isGeneratingQuestions}
                className={isGeneratingQuestions ? "button--loading" : undefined}
                disabled={isGeneratingQuestions || isSubmittingProfile}
                variant="primary"
                onClick={() => void generateQuestions()}
              >
                {isGeneratingQuestions ? "Generating AI question set..." : "Generate short AI question set"}
              </Button>
            </div>
            {isGeneratingQuestions ? (
              <div className="status-callout status-callout--info async-generation-status" aria-live="polite">
                Generating your assessment questions. This can take a few seconds.
              </div>
            ) : null}
          </>
        ) : (
          <div className="profile-studio-collapsed">
            <p>Your profile details and assessment are saved. The detailed personality analysis is shown below.</p>
          </div>
        )}
      </Card>

      {questionSet ? (
        <Card className="stack">
          <div className="card__header">
            <div>
              <p className="eyebrow">{questionSet.source}</p>
              <h2>{questionSet.questions.length} quick assessment questions</h2>
            </div>
          </div>
          {questionSet.questions.map((question, index) => (
            <fieldset key={question.id} className="question-block">
              <legend>
                <p className="eyebrow">{labelize(question.dimension)}</p>
                <h3>
                  Q{index + 1}. {question.question}
                </h3>
              </legend>
              <p>{question.whyItMatters}</p>
              <div className="option-list">
                {question.options.map((option, optionIndex) => (
                  <label key={option} className="option-card">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === optionIndex}
                      onChange={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: optionIndex
                        }))
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="actions">
            <Button
              disabled={isGeneratingQuestions || isSubmittingProfile}
              variant="primary"
              onClick={() => void submitProfile(answers)}
            >
              {isSubmittingProfile ? "Submitting..." : "Submit profile"}
            </Button>
          </div>
        </Card>
      ) : !dashboard?.profile ? (
        <EmptyState
          title="No question set yet"
          description="Generate the short AI question set to begin the structured personality and character assessment."
        />
      ) : null}

      {dashboard?.profile ? <ProfileInsightCards analysis={dashboard.profile.analysis} /> : null}
    </div>
  );
}
