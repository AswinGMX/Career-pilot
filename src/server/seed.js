const { hashPassword } = require("./auth");
const { getCareerById } = require("./careers");
const { createRecord, findUserByEmail, logActivity, mutateDb, readDb } = require("./db");

const demoAccounts = [
  {
    label: "Sunrise School Admin",
    roleLabel: "School Admin",
    description: "Tenant owner account for managing students and reviewing reports.",
    email: "admin@sunrise.demo",
    password: "demo123",
    tenantSlug: "sunrise-public-school"
  },
  {
    label: "Sunrise School Student",
    roleLabel: "School Student",
    description: "School-linked student account with a completed profile and proof history.",
    email: "student@sunrise.demo",
    password: "demo123",
    tenantSlug: "sunrise-public-school"
  },
  {
    label: "Solo Student",
    roleLabel: "Individual Student",
    description: "Independent student account for the non-school journey.",
    email: "solo@careerreality.demo",
    password: "demo123",
    tenantSlug: ""
  }
];

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function createSeedProfile({ userId, createdAt, basicInfo, analysis }) {
  return createRecord({
    userId,
    basicInfo,
    questionSet: {
      source: "seed",
      questions: []
    },
    answers: [],
    analysis,
    updatedAt: createdAt,
    createdAt
  });
}

function createSeedProof({ userId, createdAt, completedAt, careerId, careerTitle, careerCategory, evaluation }) {
  return createRecord({
    userId,
    careerId,
    careerTitle,
    careerCategory,
    status: "completed",
    questionSet: {
      source: "seed",
      introduction: "Preloaded demo proof session.",
      questions: []
    },
    answers: [],
    evaluation,
    completedAt,
    createdAt
  });
}

function ensureDemoData() {
  mutateDb((db) => {
    if (db.tenants.length || db.users.length || db.profiles.length || db.proofSessions.length) {
      return db;
    }

    const tenantCreatedAt = daysAgo(28);
    const adminCreatedAt = daysAgo(27);
    const schoolStudentCreatedAt = daysAgo(25);
    const schoolPendingCreatedAt = daysAgo(24);
    const soloStudentCreatedAt = daysAgo(22);

    const tenant = createRecord({
      name: "Sunrise Public School",
      slug: "sunrise-public-school",
      joinCode: "SUNR-2026",
      type: "school",
      createdAt: tenantCreatedAt
    });

    const schoolAdmin = createRecord({
      fullName: "Anita Das",
      email: "admin@sunrise.demo",
      passwordHash: hashPassword("demo123"),
      grade: "",
      role: "school_admin",
      tenantId: tenant.id,
      createdAt: adminCreatedAt
    });

    const schoolStudent = createRecord({
      fullName: "Aarav Menon",
      email: "student@sunrise.demo",
      passwordHash: hashPassword("demo123"),
      grade: "Grade 11",
      role: "student_school",
      tenantId: tenant.id,
      createdAt: schoolStudentCreatedAt
    });

    const pendingSchoolStudent = createRecord({
      fullName: "Meera Thomas",
      email: "meera@sunrise.demo",
      passwordHash: hashPassword("demo123"),
      grade: "Grade 10",
      role: "student_school",
      tenantId: tenant.id,
      createdAt: schoolPendingCreatedAt
    });

    const soloStudent = createRecord({
      fullName: "Nila Joseph",
      email: "solo@careerreality.demo",
      passwordHash: hashPassword("demo123"),
      grade: "Grade 12",
      role: "student_individual",
      tenantId: null,
      createdAt: soloStudentCreatedAt
    });

    const schoolProfile = createSeedProfile({
      userId: schoolStudent.id,
      createdAt: daysAgo(18),
      basicInfo: {
        ageRange: "16-17",
        grade: "Grade 11",
        favoriteSubjects: "History, Political Science, Physical Education",
        favoriteActivities: "NCC drills, team sports, volunteering, structured leadership roles",
        topicsCuriousAbout: "Defense strategy, discipline, public service, national leadership",
        personalStrengths: "Consistency, calm under pressure, stamina, team accountability",
        avoidsOrDislikes: "Chaotic planning, unclear responsibility, repeated excuses"
      },
      analysis: {
        source: "seed",
        summary:
          "Aarav shows strong signs of Discipline and Leadership. The profile suggests a strong fit for structured, duty-driven careers that reward resilience and accountability.",
        characterReadout:
          "This demo student profile reflects a school-linked learner who performs best when expectations are clear, the mission is meaningful, and personal responsibility is high.",
        dominantTraits: ["Discipline", "Leadership", "Resilience", "Physical Stamina"],
        cautionAreas: ["Creativity", "Empathy", "Independence"],
        workPreferences: [
          "Responds well to structure, routines, and clearly defined responsibility.",
          "Can stay composed in active environments where teamwork and duty matter.",
          "Performs better when goals feel mission-driven rather than purely academic."
        ],
        personalityScores: {
          analytical: 72,
          creativity: 48,
          empathy: 60,
          resilience: 86,
          communication: 74,
          discipline: 92,
          leadership: 88,
          independence: 68,
          adaptability: 79,
          physicalStamina: 84
        },
        interestSignals: [
          { tag: "law-defense", score: 94, reason: "The profile strongly leans toward service, defense, and justice-driven responsibility." },
          { tag: "public-service", score: 88, reason: "Repeated interest in leadership and national service appears across the student basics." },
          { tag: "fitness", score: 78, reason: "Active routines and stamina-based activities show up consistently." },
          { tag: "education", score: 48, reason: "Peer support and leadership suggest some mentoring potential." },
          { tag: "science", score: 44, reason: "Strategic thinking and evidence-based decisions show moderate interest signals." },
          { tag: "technology", score: 36, reason: "Technology is not a central motivation in this demo profile." }
        ]
      }
    });

    const soloProfile = createSeedProfile({
      userId: soloStudent.id,
      createdAt: daysAgo(16),
      basicInfo: {
        ageRange: "17-18",
        grade: "Grade 12",
        favoriteSubjects: "Mathematics, Computer Science, Physics",
        favoriteActivities: "Coding side projects, design experiments, logic games, maker clubs",
        topicsCuriousAbout: "Software products, AI systems, cybersecurity, startup ideas",
        personalStrengths: "Pattern recognition, self-learning, focus, problem solving",
        avoidsOrDislikes: "Heavy repetition without purpose, unclear communication, slow bureaucracy"
      },
      analysis: {
        source: "seed",
        summary:
          "Nila shows strong signs of Analytical thinking and Independence. The profile points toward technology careers that reward focused problem solving and continuous learning.",
        characterReadout:
          "This demo student profile represents an independent learner who enjoys figuring things out, building skills through practice, and staying curious about fast-changing fields.",
        dominantTraits: ["Analytical", "Independence", "Discipline", "Adaptability"],
        cautionAreas: ["Physical Stamina", "Empathy", "Leadership"],
        workPreferences: [
          "Does well in self-driven project work and focused problem-solving blocks.",
          "Learns quickly when the goal is clear and the challenge feels meaningful.",
          "Fits best in environments that reward experimentation, curiosity, and disciplined execution."
        ],
        personalityScores: {
          analytical: 91,
          creativity: 77,
          empathy: 52,
          resilience: 76,
          communication: 68,
          discipline: 84,
          leadership: 58,
          independence: 87,
          adaptability: 82,
          physicalStamina: 38
        },
        interestSignals: [
          { tag: "technology", score: 96, reason: "Strong and repeated signals around software, systems, and digital building." },
          { tag: "science", score: 82, reason: "The profile highlights comfort with logic, experimentation, and technical learning." },
          { tag: "creative", score: 70, reason: "Design exploration and product thinking show consistent creative interest." },
          { tag: "business", score: 56, reason: "Startup curiosity adds a moderate commercial interest signal." },
          { tag: "hands-on", score: 52, reason: "Maker-style projects indicate practical building energy." },
          { tag: "education", score: 38, reason: "There is some willingness to explain ideas, but it is not the core driver." }
        ]
      }
    });

    const armyOfficer = getCareerById("army-officer");
    const softwareEngineer = getCareerById("software-engineer");

    db.tenants.push(tenant);
    db.users.push(schoolAdmin, schoolStudent, pendingSchoolStudent, soloStudent);
    db.profiles.push(schoolProfile, soloProfile);

    if (armyOfficer) {
      db.proofSessions.push(
        createSeedProof({
          userId: schoolStudent.id,
          createdAt: daysAgo(14),
          completedAt: daysAgo(13),
          careerId: armyOfficer.id,
          careerTitle: armyOfficer.title,
          careerCategory: armyOfficer.category,
          evaluation: {
            source: "seed",
            overallScore: 84,
            points: 840,
            readinessBand: "Strong readiness",
            dimensionScores: {
              discipline: 92,
              leadership: 88,
              "physical-endurance": 91,
              "family-separation": 78,
              risk: 75,
              ethics: 82
            },
            strengths: ["Discipline", "Leadership", "Physical Endurance"],
            risks: ["Risk", "Family Separation", "Ethics"],
            narrative:
              "Aarav currently shows strong readiness for Army Officer because his profile reflects discipline, stamina, and comfort with responsibility. The main growth area is becoming more emotionally ready for separation and high-risk service realities.",
            parentSummary:
              "Army Officer readiness is currently 84%. This suggests a strong fit for structured service, while the biggest family discussion should focus on emotional readiness for separation and long-term duty.",
            schoolSummary:
              "The student earned 840 proof points for Army Officer. School mentors can strengthen high-pressure decision-making, emotional steadiness, and realistic service preparation.",
            nextSteps: [
              "Give the student leadership roles that require calm decision-making under pressure.",
              "Add reflective routines that build emotional steadiness around sacrifice and separation.",
              "Expose the student to real service stories so readiness stays realistic, not romanticized."
            ]
          }
        })
      );
    }

    if (softwareEngineer) {
      db.proofSessions.push(
        createSeedProof({
          userId: soloStudent.id,
          createdAt: daysAgo(12),
          completedAt: daysAgo(11),
          careerId: softwareEngineer.id,
          careerTitle: softwareEngineer.title,
          careerCategory: softwareEngineer.category,
          evaluation: {
            source: "seed",
            overallScore: 82,
            points: 820,
            readinessBand: "Strong readiness",
            dimensionScores: {
              discipline: 84,
              ambiguity: 79,
              "continuous-learning": 88,
              "problem-solving": 91,
              independence: 87
            },
            strengths: ["Problem Solving", "Continuous Learning", "Independence"],
            risks: ["Ambiguity", "Discipline", "Communication"],
            narrative:
              "Nila currently shows strong readiness for Software Engineer. The strongest evidence appears in problem solving, self-direction, and willingness to keep learning as technology changes.",
            parentSummary:
              "Software Engineer readiness is currently 82%. The student already shows a strong technical mindset, and the main support need is building communication discipline for collaborative work.",
            schoolSummary:
              "The student earned 820 proof points for Software Engineer. Mentors can support growth by adding team-based projects, delivery routines, and feedback-heavy collaboration.",
            nextSteps: [
              "Keep the student in project-based work where problem solving is visible.",
              "Build stronger communication habits through pair work and demos.",
              "Repeat deadlines and delivery practice so discipline stays consistent under ambiguity."
            ]
          }
        })
      );
    }

    logActivity(db, "demo_data_seeded", {
      tenantId: tenant.id,
      seededUsers: db.users.length,
      seededProfiles: db.profiles.length,
      seededProofSessions: db.proofSessions.length
    });

    return db;
  });
}

function getDemoAccounts() {
  const db = readDb();

  return demoAccounts.filter((account) => findUserByEmail(db, account.email)).map((account) => ({
    label: account.label,
    roleLabel: account.roleLabel,
    description: account.description,
    email: account.email,
    password: account.password,
    tenantSlug: account.tenantSlug
  }));
}

module.exports = {
  ensureDemoData,
  getDemoAccounts
};
