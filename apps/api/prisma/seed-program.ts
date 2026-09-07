import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PROGRAM_SLUG = "software-engineer-reality";

type BlockSeed = {
  kind: "text" | "task_prompt" | "scenario" | "video" | "audio" | "panorama360";
  body?: Record<string, unknown>;
  scenarioGraph?: Record<string, unknown>;
};

// Demo media for seeded media blocks. In production these blocks carry an
// attached MediaAsset (signed URL); the frontend falls back to `body.src` here
// so the seeded program renders real players without a pre-uploaded object.
const DEMO_VIDEO_URL = "https://www.w3schools.com/html/mov_bbb.mp4";
const DEMO_PANORAMA_URL = "https://picsum.photos/seed/engineering-workspace/2400/1200";

type ModuleSeed = {
  type: "lesson" | "scenario" | "task" | "reflection";
  title: string;
  blocks: BlockSeed[];
};

type DaySeed = {
  title: string;
  objective: string;
  estimatedMinutes: number;
  modules: ModuleSeed[];
};

const DAYS: DaySeed[] = [
  {
    title: "A Day in the Life",
    objective: "Understand what a software engineer actually does day to day.",
    estimatedMinutes: 35,
    modules: [
      {
        type: "lesson",
        title: "The real rhythm of engineering",
        blocks: [
          {
            kind: "text",
            body: {
              heading: "Beyond writing code",
              markdown:
                "Most of a software engineer's day is *not* typing code. It is reading code, understanding requirements, debugging, reviewing teammates' work, and communicating. Today you'll see the real shape of the job."
            }
          }
        ]
      },
      {
        type: "lesson",
        title: "Watch: a day in the life",
        blocks: [
          {
            kind: "video",
            body: {
              heading: "What the work actually looks like",
              src: DEMO_VIDEO_URL,
              caption: "A short look at the real rhythm of an engineering team."
            }
          }
        ]
      },
      {
        type: "reflection",
        title: "First reflection",
        blocks: [
          {
            kind: "task_prompt",
            body: {
              prompt: "Describe a time you had to understand something complex that someone else built. How did you approach it?",
              evidenceKind: "text"
            }
          }
        ]
      }
    ]
  },
  {
    title: "Reading Real Code",
    objective: "Practice the most common engineering skill: understanding existing code.",
    estimatedMinutes: 40,
    modules: [
      {
        type: "lesson",
        title: "How engineers read unfamiliar code",
        blocks: [
          {
            kind: "text",
            body: {
              heading: "Top-down, then bottom-up",
              markdown:
                "Engineers rarely read code top to bottom. They find an entry point, trace the data, and form a mental model. You will do this for the rest of your career."
            }
          }
        ]
      },
      {
        type: "task",
        title: "Trace the flow",
        blocks: [
          {
            kind: "task_prompt",
            body: {
              prompt: "Given a feature you use daily (e.g. login), list the steps you think happen from button click to result. Submit your best guess.",
              evidenceKind: "text"
            }
          }
        ]
      }
    ]
  },
  {
    title: "Debugging Under Pressure",
    objective: "Experience how engineers reason when something is broken and the clock is ticking.",
    estimatedMinutes: 45,
    modules: [
      {
        type: "scenario",
        title: "The production bug",
        blocks: [
          {
            kind: "scenario",
            scenarioGraph: {
              start: "n1",
              nodes: {
                n1: {
                  prompt:
                    "A critical feature is failing in production. Users are affected. What do you do first?",
                  options: [
                    { id: "a", label: "Immediately start changing code to fix it", next: "n2", signals: { composure: 1, rigor: 0 } },
                    { id: "b", label: "Reproduce the issue and read the error logs", next: "n3", signals: { composure: 3, rigor: 3 } },
                    { id: "c", label: "Restart the server and hope it resolves", next: "n2", signals: { composure: 1, rigor: 1 } }
                  ]
                },
                n2: {
                  prompt: "The issue is still unclear and you've lost time. What now?",
                  options: [
                    { id: "a", label: "Step back, reproduce, and read the logs", next: "n3", signals: { composure: 2, rigor: 3 } }
                  ]
                },
                n3: {
                  prompt: "You found the root cause in the logs and shipped a targeted fix. Incident resolved.",
                  terminal: true
                }
              }
            }
          }
        ]
      },
      {
        type: "lesson",
        title: "Look around: the war room",
        blocks: [
          {
            kind: "panorama360",
            body: {
              heading: "Where incidents get handled",
              src: DEMO_PANORAMA_URL,
              caption: "Drag to look around a real incident-response setup."
            }
          }
        ]
      },
      {
        type: "reflection",
        title: "Debrief",
        blocks: [
          {
            kind: "task_prompt",
            body: { prompt: "How did it feel to act under pressure? What was your instinct?", evidenceKind: "text" }
          }
        ]
      }
    ]
  },
  {
    title: "Working With a Team",
    objective: "See how collaboration, code review, and communication shape the work.",
    estimatedMinutes: 35,
    modules: [
      {
        type: "lesson",
        title: "Code review is communication",
        blocks: [
          {
            kind: "text",
            body: {
              heading: "Your code is read more than it's written",
              markdown: "Clear naming, small changes, and kind, specific review comments matter more than clever one-liners."
            }
          }
        ]
      },
      {
        type: "task",
        title: "Give feedback",
        blocks: [
          {
            kind: "task_prompt",
            body: { prompt: "Write a code-review comment for a teammate whose change works but is hard to read. Be specific and kind.", evidenceKind: "text" }
          }
        ]
      }
    ]
  },
  {
    title: "Shipping a Feature",
    objective: "Walk through scoping, building, and releasing a small feature.",
    estimatedMinutes: 40,
    modules: [
      {
        type: "lesson",
        title: "From idea to release",
        blocks: [
          {
            kind: "text",
            body: { heading: "Small, safe steps", markdown: "Great engineers ship in small, reversible increments behind flags, with tests, rather than big risky drops." }
          }
        ]
      },
      {
        type: "reflection",
        title: "Plan it",
        blocks: [
          {
            kind: "task_prompt",
            body: { prompt: "Break a 'dark mode toggle' feature into 3-5 small, shippable steps.", evidenceKind: "text" }
          }
        ]
      },
      {
        type: "task",
        title: "Record your plan",
        blocks: [
          {
            kind: "task_prompt",
            body: {
              prompt: "Record a 60-second voice note walking through how you'd ship the toggle safely.",
              evidenceKind: "audio"
            }
          }
        ]
      }
    ]
  },
  {
    title: "Handling Production Incidents",
    objective: "Build the calm, methodical mindset incidents demand.",
    estimatedMinutes: 45,
    modules: [
      {
        type: "scenario",
        title: "3am page",
        blocks: [
          {
            kind: "scenario",
            scenarioGraph: {
              start: "n1",
              nodes: {
                n1: {
                  prompt: "You're on call. An alert fires at 3am: error rate is spiking. First move?",
                  options: [
                    { id: "a", label: "Acknowledge the alert and check the dashboard", next: "n2", signals: { ownership: 3, composure: 3 } },
                    { id: "b", label: "Ignore it; it might self-resolve", next: "n2", signals: { ownership: 0, composure: 1 } }
                  ]
                },
                n2: { prompt: "You mitigate, communicate status, and write a follow-up. Incident closed.", terminal: true }
              }
            }
          }
        ]
      },
      {
        type: "task",
        title: "Postmortem",
        blocks: [
          {
            kind: "task_prompt",
            body: { prompt: "Write 2 sentences on what a blameless postmortem should focus on.", evidenceKind: "text" }
          }
        ]
      }
    ]
  },
  {
    title: "Career Reality Check",
    objective: "Reflect on whether this career fits how you think and work.",
    estimatedMinutes: 30,
    modules: [
      {
        type: "lesson",
        title: "Interest vs. fit",
        blocks: [
          {
            kind: "text",
            body: { heading: "What you've experienced", markdown: "Over 7 days you've read code, debugged, collaborated, shipped, and handled an incident. That's the real job." }
          }
        ]
      },
      {
        type: "reflection",
        title: "Final reflection",
        blocks: [
          {
            kind: "task_prompt",
            body: { prompt: "After this week, how do you feel about software engineering as a career for you? Be honest.", evidenceKind: "text" }
          }
        ]
      }
    ]
  }
];

async function main(): Promise<void> {
  console.log(`Seeding program "${PROGRAM_SLUG}"...`);

  // Idempotent: remove any existing program with this slug (cascades to versions/days/...).
  await prisma.experienceProgram.deleteMany({ where: { slug: PROGRAM_SLUG } });

  const program = await prisma.experienceProgram.create({
    data: {
      slug: PROGRAM_SLUG,
      title: "Software Engineer — Career Reality Program",
      summary:
        "A 7-day immersive experience: read real code, debug under pressure, collaborate, ship a feature, and handle an incident — then decide if this career fits you.",
      status: "published"
    }
  });

  const version = await prisma.programVersion.create({
    data: {
      programId: program.id,
      version: 1,
      state: "published",
      durationDays: DAYS.length,
      generationSource: "human",
      promptVersion: "seed-v1",
      publishedAt: new Date(),
      rubric: {
        create: {
          dimensionsJson: ["rigor", "composure", "ownership", "communication", "adaptability"] as Prisma.InputJsonValue,
          scaleJson: { min: 0, max: 100, bands: ["emerging", "developing", "strong", "exceptional"] } as Prisma.InputJsonValue
        }
      },
      days: {
        create: DAYS.map((day, dayIdx) => ({
          dayIndex: dayIdx + 1,
          title: day.title,
          objective: day.objective,
          estimatedMinutes: day.estimatedMinutes,
          modules: {
            create: day.modules.map((mod, modIdx) => ({
              order: modIdx + 1,
              type: mod.type,
              title: mod.title,
              blocks: {
                create: mod.blocks.map((block, blockIdx) => ({
                  order: blockIdx + 1,
                  kind: block.kind,
                  bodyJson: (block.body ?? undefined) as Prisma.InputJsonValue | undefined,
                  ...(block.scenarioGraph
                    ? { scenario: { create: { graphJson: block.scenarioGraph as Prisma.InputJsonValue } } }
                    : {})
                }))
              }
            }))
          }
        }))
      }
    }
  });

  await prisma.experienceProgram.update({
    where: { id: program.id },
    data: { currentPublishedVersionId: version.id }
  });

  console.log(`Seeded program ${program.slug} (version ${version.version}, ${DAYS.length} days).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
