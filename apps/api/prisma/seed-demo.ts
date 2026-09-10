import { PrismaClient, UserAccountType, UserStatus, MembershipRole, ProfileCompletionStatus } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** All demo accounts use password: demo1234 */
const DEMO_PASSWORD = "demo1234";

async function main(): Promise<void> {
  const pw = hashPassword(DEMO_PASSWORD);

  /* ── 1. School tenant ── */
  const tenant = await prisma.tenant.upsert({
    where: { slug: "sunrise-public-school" },
    update: { name: "Sunrise Public School" },
    create: {
      name: "Sunrise Public School",
      slug: "sunrise-public-school"
    }
  });

  /* ── 2. School admin ── */
  const admin = await prisma.user.upsert({
    where: { email: "admin@sunrise.demo" },
    update: {},
    create: {
      email: "admin@sunrise.demo",
      fullName: "Anita Das",
      passwordHash: pw,
      accountType: UserAccountType.tenant_member,
      status: UserStatus.active
    }
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: admin.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: admin.id,
      role: MembershipRole.school_admin
    }
  });

  /* ── 3. School students ── */
  const schoolStudents = [
    {
      email: "aarav@sunrise.demo",
      fullName: "Aarav Menon",
      profile: {
        gradeLevel: "Grade 11",
        ageBand: "16-17",
        favoriteSubjects: ["Mathematics", "Computer Science"],
        favoriteActivities: ["Coding", "Robotics club"],
        topicsCuriousAbout: ["Artificial Intelligence", "Systems design"],
        personalStrengths: ["Focus", "Problem-solving"],
        avoidsOrDislikes: ["Memorization-heavy subjects"],
        completionStatus: ProfileCompletionStatus.submitted
      }
    },
    {
      email: "meera@sunrise.demo",
      fullName: "Meera Thomas",
      profile: {
        gradeLevel: "Grade 10",
        ageBand: "15-16",
        favoriteSubjects: ["Biology", "Chemistry"],
        favoriteActivities: ["Volunteering at clinic", "Reading"],
        topicsCuriousAbout: ["Medicine", "Public health"],
        personalStrengths: ["Empathy", "Discipline"],
        avoidsOrDislikes: ["Unstructured work"],
        completionStatus: ProfileCompletionStatus.submitted
      }
    },
    {
      email: "rohan@sunrise.demo",
      fullName: "Rohan Pillai",
      profile: {
        gradeLevel: "Grade 11",
        ageBand: "16-17",
        favoriteSubjects: ["English", "History", "Economics"],
        favoriteActivities: ["Debating", "Model United Nations"],
        topicsCuriousAbout: ["Policy", "Governance", "Law"],
        personalStrengths: ["Communication", "Leadership"],
        avoidsOrDislikes: ["Repetitive tasks"],
        completionStatus: ProfileCompletionStatus.submitted
      }
    }
  ];

  for (const s of schoolStudents) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        fullName: s.fullName,
        passwordHash: pw,
        accountType: UserAccountType.tenant_member,
        status: UserStatus.active
      }
    });

    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: {},
      create: {
        tenantId: tenant.id,
        userId: user.id,
        role: MembershipRole.student
      }
    });

    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        tenantId: tenant.id,
        ...s.profile,
        submittedAt: new Date()
      }
    });
  }

  /* ── 4. Individual (solo) student ── */
  const solo = await prisma.user.upsert({
    where: { email: "nila@careerreality.demo" },
    update: {},
    create: {
      email: "nila@careerreality.demo",
      fullName: "Nila Joseph",
      passwordHash: pw,
      accountType: UserAccountType.individual,
      status: UserStatus.active
    }
  });

  await prisma.studentProfile.upsert({
    where: { userId: solo.id },
    update: {},
    create: {
      userId: solo.id,
      gradeLevel: "Grade 12",
      ageBand: "17-18",
      favoriteSubjects: ["Art", "Design", "Psychology"],
      favoriteActivities: ["Digital illustration", "UX projects"],
      topicsCuriousAbout: ["UX Design", "Human behavior", "Product thinking"],
      personalStrengths: ["Creativity", "Observation"],
      avoidsOrDislikes: ["Heavy math", "Routine paperwork"],
      completionStatus: ProfileCompletionStatus.submitted,
      submittedAt: new Date()
    }
  });

  console.log("Demo data seeded successfully.");
  console.log("");
  console.log("Demo accounts (password: demo1234):");
  console.log("  School admin:    admin@sunrise.demo");
  console.log("  School students: aarav@sunrise.demo, meera@sunrise.demo, rohan@sunrise.demo");
  console.log("  Solo student:    nila@careerreality.demo");
  console.log(`  School slug:     sunrise-public-school`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
