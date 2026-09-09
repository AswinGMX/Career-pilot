"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ProfileAssessmentResult, ProfileUpdatePayload, ProofQuestionSet, StudentProfile } from "@career-pilot/types";

import { generateAssessmentQuestions, submitProfileAssessment, submitStudentProfile, updateStudentProfile } from "@/lib/api";

const GRADE_LEVEL_OPTIONS = [
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "Undergraduate",
  "Graduate"
];

const AGE_BAND_OPTIONS = ["13-14", "14-15", "15-16", "16-17", "17-18", "18+"];

function listToText(values: string[]): string {
  return values.join(", ");
}

function textToList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}): JSX.Element {
  return (
    <label className="field-label">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="field-control"
      />
    </label>
  );
}

function CharacterProfileView({
  result,
  onEdit
}: {
  result: ProfileAssessmentResult;
  onEdit: () => void;
}): JSX.Element {
  return (
    <div className="char-profile">
      <div className="char-profile__grid">
        <div className="char-profile__card char-profile__card--summary">
          <h4 className="char-profile__label">Character Summary</h4>
          <p className="char-profile__narrative">{result.narrative}</p>
          <h4 className="char-profile__label" style={{ marginTop: 16 }}>Detailed Readout</h4>
          <ul className="char-profile__readout">
            {result.detailedReadout.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
        <div className="char-profile__card char-profile__card--dominant">
          <h4 className="char-profile__label char-profile__label--success">Dominant Traits</h4>
          <div className="char-profile__traits">
            {result.dimensions
              .filter((d) => d.type === "dominant")
              .sort((a, b) => b.score - a.score)
              .map((dim) => (
                <div key={dim.dimension} className="char-profile__trait-card char-profile__trait-card--strong">
                  <div className="char-profile__trait-header">
                    <span className="char-profile__trait-name">{dim.dimension}</span>
                    <span className="char-profile__badge char-profile__badge--success">{dim.score}%</span>
                  </div>
                  <p className="char-profile__trait-desc">{dim.description}</p>
                </div>
              ))}
          </div>
        </div>
        <div className="char-profile__card char-profile__card--caution">
          <h4 className="char-profile__label char-profile__label--caution">Caution Areas</h4>
          <div className="char-profile__traits">
            {result.dimensions
              .filter((d) => d.type === "caution")
              .sort((a, b) => a.score - b.score)
              .map((dim) => (
                <div key={dim.dimension} className="char-profile__trait-card char-profile__trait-card--weak">
                  <div className="char-profile__trait-header">
                    <span className="char-profile__trait-name">{dim.dimension}</span>
                    <span className="char-profile__badge char-profile__badge--caution">{dim.score}%</span>
                  </div>
                  <p className="char-profile__trait-desc">{dim.description}</p>
                </div>
              ))}
            {result.dimensions.every((d) => d.type === "dominant") ? (
              <p className="char-profile__empty">No caution areas. Great work!</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileForm({
  initialProfile,
  studentName,
  initialAssessmentResult,
  isEditingControlled,
  onEditingChange
}: {
  initialProfile: StudentProfile | null;
  studentName: string;
  initialAssessmentResult: ProfileAssessmentResult | null;
  isEditingControlled?: boolean;
  onEditingChange?: (editing: boolean) => void;
}): JSX.Element {
  const router = useRouter();
  const [gradeLevel, setGradeLevel] = useState(initialProfile?.gradeLevel || "");
  const [ageBand, setAgeBand] = useState(initialProfile?.ageBand || "");
  const [favoriteSubjects, setFavoriteSubjects] = useState(listToText(initialProfile?.favoriteSubjects || []));
  const [favoriteActivities, setFavoriteActivities] = useState(listToText(initialProfile?.favoriteActivities || []));
  const [topicsCuriousAbout, setTopicsCuriousAbout] = useState(listToText(initialProfile?.topicsCuriousAbout || []));
  const [personalStrengths, setPersonalStrengths] = useState(listToText(initialProfile?.personalStrengths || []));
  const [avoidsOrDislikes, setAvoidsOrDislikes] = useState(listToText(initialProfile?.avoidsOrDislikes || []));
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionSet, setQuestionSet] = useState<ProofQuestionSet | null>(initialProfile?.cachedAssessmentQuestions ?? null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isScoring, setIsScoring] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<ProfileAssessmentResult | null>(initialAssessmentResult);
  const [internalIsEditing, setInternalIsEditing] = useState(
    !initialAssessmentResult && (!initialProfile || initialProfile.completionStatus !== "submitted")
  );
  const isControlled = typeof isEditingControlled === "boolean";
  const isEditing = isControlled ? isEditingControlled : internalIsEditing;
  const setIsEditing = (next: boolean): void => {
    if (!isControlled) {
      setInternalIsEditing(next);
    }
    onEditingChange?.(next);
  };

  const payload: ProfileUpdatePayload = {
    gradeLevel,
    ageBand,
    favoriteSubjects: textToList(favoriteSubjects),
    favoriteActivities: textToList(favoriteActivities),
    topicsCuriousAbout: textToList(topicsCuriousAbout),
    personalStrengths: textToList(personalStrengths),
    avoidsOrDislikes: textToList(avoidsOrDislikes)
  };

  // After assessment is completed, show only the result view
  if (assessmentResult && !isEditing) {
    return (
      <div>
        {isControlled ? null : (
          <div className="button-row" style={{ marginBottom: 16 }}>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setIsEditing(true)}
            >
              Edit profile
            </button>
          </div>
        )}
        <CharacterProfileView
          result={assessmentResult}
          onEdit={() => setIsEditing(true)}
        />
      </div>
    );
  }

  return (
    <div className="form-stack">
      {assessmentResult ? (
        <CharacterProfileView
          result={assessmentResult}
          onEdit={() => {}}
        />
      ) : null}
      <div className="profile-field-row profile-field-row--lead">
        <label className="field-label">
          <span>Age band</span>
          <select
            value={ageBand}
            onChange={(event) => setAgeBand(event.target.value)}
            className="field-control"
          >
            <option value="">Select age band</option>
            {ageBand && !AGE_BAND_OPTIONS.includes(ageBand) ? (
              <option value={ageBand}>{ageBand}</option>
            ) : null}
            {AGE_BAND_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="field-label">
          <span>Grade level</span>
          <select
            value={gradeLevel}
            onChange={(event) => setGradeLevel(event.target.value)}
            className="field-control"
          >
            <option value="">Select grade level</option>
            {gradeLevel && !GRADE_LEVEL_OPTIONS.includes(gradeLevel) ? (
              <option value={gradeLevel}>{gradeLevel}</option>
            ) : null}
            {GRADE_LEVEL_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="field-label">
          <span>Favorite subjects</span>
          <input
            value={favoriteSubjects}
            onChange={(event) => setFavoriteSubjects(event.target.value)}
            placeholder="e.g. Math, Physics, Computer Science"
            className="field-control"
          />
        </label>
      </div>
      <div className="profile-field-row profile-field-row--pair">
        <Field
          label="Favorite activities"
          value={favoriteActivities}
          onChange={setFavoriteActivities}
          placeholder="e.g. Chess, coding, debate club"
        />
        <Field
          label="Topics curious about"
          value={topicsCuriousAbout}
          onChange={setTopicsCuriousAbout}
          placeholder="e.g. Artificial intelligence, space exploration, psychology"
        />
      </div>
      <div className="profile-field-row profile-field-row--pair">
        <Field
          label="Personal strengths"
          value={personalStrengths}
          onChange={setPersonalStrengths}
          placeholder="e.g. Fast learner, analytical thinking, teamwork"
        />
        <Field
          label="Avoids or dislikes"
          value={avoidsOrDislikes}
          onChange={setAvoidsOrDislikes}
          placeholder="e.g. Public speaking, rote memorization"
        />
      </div>
      {message ? <p className="status-text--success" style={{ margin: 0 }}>{message}</p> : null}
      {error ? <p className="status-text--error" style={{ margin: 0 }}>{error}</p> : null}
      <div className="button-row">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);
            setError(null);
            setMessage(null);

            try {
              await updateStudentProfile(payload);
              await submitStudentProfile();
              setMessage("Profile submitted.");
              router.refresh();
            } catch (caughtError) {
              setError((caughtError as Error).message);
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="button-secondary"
        >
          {isSubmitting ? "Submitting..." : "Save & Submit"}
        </button>
        <button
          type="button"
          disabled={isGenerating || Boolean(questionSet)}
          onClick={async () => {
            if (questionSet) return;
            setIsGenerating(true);
            setError(null);
            setMessage(null);
            setSelectedAnswers({});
            setAssessmentResult(null);

            try {
              await updateStudentProfile(payload);
              const response = await generateAssessmentQuestions();
              setQuestionSet(response.questionSet);
              setMessage("Behavioral assessment questions generated.");
            } catch (caughtError) {
              setError((caughtError as Error).message);
            } finally {
              setIsGenerating(false);
            }
          }}
          className="button-primary"
        >
          {isGenerating ? "Generating..." : questionSet ? "Free AI Generation Used (1/1)" : "Generate AI Questions"}
        </button>
      </div>
      {questionSet ? (
        <div className="question-set">
          <p className="question-set__intro">{questionSet.introduction}</p>
          <ol className="question-set__list">
            {questionSet.questions.map((question, index) => (
              <li key={question.id} className="question-set__item">
                <div className="question-set__header">
                  <span className="question-set__number">{index + 1}.</span>
                  <span className="question-set__dimension">{question.dimension}</span>
                </div>
                <p className="question-set__text">{question.question}</p>
                <p className="question-set__why">{question.whyItMatters}</p>
                <ul className="question-set__options">
                  {question.options.map((option, optionIndex) => (
                    <li
                      key={optionIndex}
                      className={`question-set__option${selectedAnswers[question.id] === optionIndex ? " question-set__option--selected" : ""}`}
                      onClick={() => setSelectedAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {!assessmentResult ? (
            <div className="button-row" style={{ marginTop: 20 }}>
              <button
                type="button"
                disabled={isScoring || Object.keys(selectedAnswers).length < questionSet.questions.length}
                onClick={async () => {
                  setIsScoring(true);
                  setError(null);
                  setMessage(null);

                  try {
                    const response = await submitProfileAssessment({
                      questions: questionSet.questions,
                      answers: questionSet.questions.map((q) => ({
                        questionId: q.id,
                        optionIndex: selectedAnswers[q.id] ?? 0
                      }))
                    });
                    setAssessmentResult(response.result);
                    setQuestionSet(null);
                    setIsEditing(false);
                  } catch (caughtError) {
                    setError((caughtError as Error).message);
                  } finally {
                    setIsScoring(false);
                  }
                }}
                className="button-primary"
              >
                {isScoring
                  ? "Scoring..."
                  : Object.keys(selectedAnswers).length < questionSet.questions.length
                    ? `Answer all questions (${Object.keys(selectedAnswers).length}/${questionSet.questions.length})`
                    : "Submit Assessment"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
