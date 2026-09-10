import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Behavioural dimensions scored by the evaluation engine (must match the rubric
// the EvaluationService reads). Scenario option `signals` reference these keys.
const DIMENSIONS = ["rigor", "composure", "ownership", "communication", "adaptability"];

type BlockSeed = {
  kind: "text" | "task_prompt" | "scenario" | "panorama360";
  body?: Record<string, unknown>;
  scenarioGraph?: Record<string, unknown>;
};
type ModuleSeed = { type: "lesson" | "scenario" | "task" | "reflection"; title: string; blocks: BlockSeed[] };
type DaySeed = { title: string; objective: string; estimatedMinutes: number; modules: ModuleSeed[] };

interface CareerSpec {
  slug: string;
  title: string;
  summary: string;
  dayInLife: { heading: string; markdown: string };
  /** [day1 reflection, day3 reflection, day5 final reflection] */
  reflections: [string, string, string];
  scenarioA: Record<string, unknown>;
  scenarioB: Record<string, unknown>;
  evidence: { prompt: string; kind: "video" | "audio" | "image" };
  panoramaCaption: string;
}

/** Two-node branching scenario helper: one decision (with signals) → outcome. */
function scenario(
  prompt: string,
  options: Array<{ id: string; label: string; signals: Partial<Record<string, number>> }>,
  outcome: string
): Record<string, unknown> {
  return {
    start: "n1",
    nodes: {
      n1: { prompt, options: options.map((o) => ({ ...o, next: "n2" })) },
      n2: { prompt: outcome, terminal: true }
    }
  };
}

const CAREERS: CareerSpec[] = [
  {
    slug: "doctor-reality",
    title: "Doctor — Career Reality Program",
    summary: "Experience the clinical reasoning, composure, and patient communication a doctor relies on every day.",
    dayInLife: {
      heading: "Beyond the white coat",
      markdown:
        "A doctor's day is triage, uncertainty, and communication under pressure — far more than diagnosis. Today you'll see the real rhythm of clinical work."
    },
    reflections: [
      "Describe a time you stayed calm and helped someone who was distressed. What did you do first?",
      "After seeing a real clinical setting, what surprised you most about the pace and pressure?",
      "After this week, does the responsibility of patient care fit how you handle stress? Be honest."
    ],
    scenarioA: scenario(
      "Two patients arrive at once: one with chest pain, one with a deep cut that is bleeding. What do you do first?",
      [
        { id: "a", label: "Assess the chest-pain patient immediately — it could be life-threatening", signals: { rigor: 3, composure: 3, ownership: 2 } },
        { id: "b", label: "Treat the visible bleeding first because it looks worse", signals: { rigor: 1, composure: 1 } },
        { id: "c", label: "Ask both to wait while you find a senior", signals: { ownership: 0, composure: 1 } }
      ],
      "You prioritised by clinical risk, stabilised the chest-pain patient, and delegated the laceration. Correct triage."
    ),
    scenarioB: scenario(
      "A patient refuses a recommended treatment out of fear. How do you respond?",
      [
        { id: "a", label: "Explain the risks and benefits plainly and listen to their fear", signals: { communication: 3, composure: 2, ownership: 2 } },
        { id: "b", label: "Insist firmly that they must comply", signals: { communication: 0, adaptability: 0 } },
        { id: "c", label: "Drop it to avoid conflict", signals: { ownership: 0 } }
      ],
      "You built trust, addressed the fear, and reached informed consent. That is the real skill."
    ),
    evidence: { prompt: "Record a 60-second clear explanation of a health topic for a worried patient.", kind: "audio" },
    panoramaCaption: "Drag to look around a hospital ward."
  },
  {
    slug: "interior-designer-reality",
    title: "Interior Designer — Career Reality Program",
    summary: "Balance creativity, budgets, and demanding clients the way a working interior designer must.",
    dayInLife: {
      heading: "Creativity meets constraints",
      markdown:
        "Design is taste plus tradeoffs: budgets, deadlines, and clients who change their minds. Today you'll feel both sides."
    },
    reflections: [
      "Describe something you redesigned or rearranged to work better. What was your thinking?",
      "After seeing a real space, how would you balance beauty against a tight budget?",
      "Does juggling creative vision with client demands energise or drain you? Be honest."
    ],
    scenarioA: scenario(
      "Your client loves a design that is 30% over budget. What do you do?",
      [
        { id: "a", label: "Propose a revised plan that keeps the look within budget", signals: { adaptability: 3, communication: 2, rigor: 2 } },
        { id: "b", label: "Build the over-budget version and hope they pay", signals: { rigor: 0, ownership: 0 } },
        { id: "c", label: "Tell them it can't be done", signals: { adaptability: 0, communication: 1 } }
      ],
      "You protected the vision and the budget with a smart compromise. That keeps clients and projects alive."
    ),
    scenarioB: scenario(
      "On install day the sofa doesn't fit through the door. How do you react?",
      [
        { id: "a", label: "Stay calm, measure, and arrange an alternative entry or swap", signals: { composure: 3, adaptability: 3, ownership: 2 } },
        { id: "b", label: "Panic and blame the supplier", signals: { composure: 0, ownership: 0 } }
      ],
      "You solved it on the spot without drama. Site problems are the job, not the exception."
    ),
    evidence: { prompt: "Upload a sketch or photo of a space you would redesign, with one note on your idea.", kind: "image" },
    panoramaCaption: "Drag to look around a design studio."
  },
  {
    slug: "data-analyst-reality",
    title: "Data Analyst — Career Reality Program",
    summary: "Turn messy data into decisions — and learn the rigour and communication analysts live by.",
    dayInLife: {
      heading: "From numbers to decisions",
      markdown:
        "Analysts spend less time on charts and more on cleaning data, questioning it, and explaining it to non-experts. Today you'll do both."
    },
    reflections: [
      "Describe a time you spotted a pattern others missed. How did you check it was real?",
      "After seeing real analytics work, what part of it appeals to you — and what doesn't?",
      "Does sitting with ambiguous data until it makes sense suit your patience? Be honest."
    ],
    scenarioA: scenario(
      "A report you built shows a surprising spike. A manager wants to act on it now. What do you do?",
      [
        { id: "a", label: "Verify the data and check for errors before anyone acts", signals: { rigor: 3, ownership: 3, composure: 2 } },
        { id: "b", label: "Present it as fact because the deadline is now", signals: { rigor: 0 } },
        { id: "c", label: "Hide it until you're sure, telling no one", signals: { communication: 0, ownership: 1 } }
      ],
      "You caught a data error before a costly decision. Rigour over speed is what analysts are paid for."
    ),
    scenarioB: scenario(
      "A stakeholder doesn't understand your chart. How do you respond?",
      [
        { id: "a", label: "Re-explain in plain language tied to their goal", signals: { communication: 3, adaptability: 2 } },
        { id: "b", label: "Repeat the same technical explanation louder", signals: { communication: 0, adaptability: 0 } }
      ],
      "You translated the data into a decision they could use. Analysis nobody understands is wasted."
    ),
    evidence: { prompt: "Record a 60-second explanation of an insight from any chart or number you've seen recently.", kind: "audio" },
    panoramaCaption: "Drag to look around an analytics team's workspace."
  },
  {
    slug: "graphic-designer-reality",
    title: "Graphic Designer — Career Reality Program",
    summary: "Create under feedback, deadlines, and brand rules — the reality behind the portfolio.",
    dayInLife: {
      heading: "Craft under critique",
      markdown:
        "Designers handle revisions, brand constraints, and blunt feedback daily. The craft is staying creative while taking notes well."
    },
    reflections: [
      "Describe something you designed or made. How did you handle feedback on it?",
      "After seeing a real design workflow, how do you feel about constant revisions?",
      "Does turning criticism into better work motivate you or frustrate you? Be honest."
    ],
    scenarioA: scenario(
      "A client rejects your favourite concept and prefers a weaker one. What do you do?",
      [
        { id: "a", label: "Show why your concept serves their goal, but respect their call", signals: { communication: 3, ownership: 2, adaptability: 2 } },
        { id: "b", label: "Deliver the weaker one with no comment, resentful", signals: { communication: 0, ownership: 0 } },
        { id: "c", label: "Refuse and submit your version anyway", signals: { adaptability: 0, ownership: 1 } }
      ],
      "You advocated for good work without ego. That is how designers earn trust and creative freedom."
    ),
    scenarioB: scenario(
      "It's 30 minutes to deadline and the file has a glaring error. What now?",
      [
        { id: "a", label: "Stay composed, fix the critical error, flag minor ones for later", signals: { composure: 3, rigor: 2, ownership: 2 } },
        { id: "b", label: "Submit as-is and hope nobody notices", signals: { rigor: 0, ownership: 0 } }
      ],
      "You shipped clean work under pressure. Calm triage beats panic every time."
    ),
    evidence: { prompt: "Upload an image of any design or visual you've made, with one line on the idea.", kind: "image" },
    panoramaCaption: "Drag to look around a creative agency floor."
  },
  {
    slug: "teacher-reality",
    title: "Teacher — Career Reality Program",
    summary: "Lead a room, adapt on the fly, and keep your patience — the daily reality of teaching.",
    dayInLife: {
      heading: "More than lessons",
      markdown:
        "Teaching is classroom management, adapting to confused students, and patience under noise. The plan rarely survives contact with the room."
    },
    reflections: [
      "Describe a time you explained something to someone who didn't get it. What did you change?",
      "After seeing a real classroom, what part of managing a room worries or excites you?",
      "Does repeating yourself patiently until someone understands suit you? Be honest."
    ],
    scenarioA: scenario(
      "Half the class clearly doesn't understand your lesson, and time is short. What do you do?",
      [
        { id: "a", label: "Stop, re-teach the core idea a different way", signals: { adaptability: 3, communication: 3, ownership: 2 } },
        { id: "b", label: "Push ahead to finish the syllabus", signals: { adaptability: 0, ownership: 1 } },
        { id: "c", label: "Blame the students for not paying attention", signals: { ownership: 0, communication: 0 } }
      ],
      "You adjusted to the room, not the plan. Reaching students beats covering content."
    ),
    scenarioB: scenario(
      "Two students start arguing loudly mid-class. How do you respond?",
      [
        { id: "a", label: "Calmly de-escalate and refocus the room", signals: { composure: 3, communication: 2, ownership: 2 } },
        { id: "b", label: "Shout to regain control", signals: { composure: 0, communication: 0 } }
      ],
      "You kept the room calm and learning. Composure is a teacher's core tool."
    ),
    evidence: { prompt: "Record a 60-second mini-lesson teaching any concept clearly and simply.", kind: "video" },
    panoramaCaption: "Drag to look around a classroom."
  },
  {
    slug: "civil-engineer-reality",
    title: "Civil Engineer — Career Reality Program",
    summary: "Make safety-critical calls, manage sites, and own outcomes the way civil engineers must.",
    dayInLife: {
      heading: "Where mistakes are expensive",
      markdown:
        "Civil engineering blends precise calculation with messy site reality and high stakes — people's safety depends on your rigour."
    },
    reflections: [
      "Describe a time you had to be precise because a mistake would be costly. How did you check your work?",
      "After seeing a real site, how do you feel about responsibility for safety?",
      "Does owning high-stakes, detail-heavy decisions fit you? Be honest."
    ],
    scenarioA: scenario(
      "A contractor wants to skip a safety check to stay on schedule. What do you do?",
      [
        { id: "a", label: "Refuse and insist the check is completed", signals: { rigor: 3, ownership: 3, composure: 2 } },
        { id: "b", label: "Allow it once to keep the timeline", signals: { rigor: 0, ownership: 0 } }
      ],
      "You held the line on safety against schedule pressure. That judgment defines the profession."
    ),
    scenarioB: scenario(
      "Your calculations don't match a colleague's on a load-bearing element. What now?",
      [
        { id: "a", label: "Recheck both calmly and find the discrepancy before proceeding", signals: { rigor: 3, communication: 2, composure: 2 } },
        { id: "b", label: "Assume yours is right and move on", signals: { rigor: 0, communication: 0 } }
      ],
      "You resolved the discrepancy before building on it. Disagreement is a safety feature, not a fight."
    ),
    evidence: { prompt: "Upload a photo or sketch of a structure and note one thing that makes it safe or risky.", kind: "image" },
    panoramaCaption: "Drag to look around a construction site."
  },
  {
    slug: "accountant-reality",
    title: "Chartered Accountant — Career Reality Program",
    summary: "Live with precision, deadlines, and ethical pressure — the real world of accounting.",
    dayInLife: {
      heading: "Precision is the product",
      markdown:
        "Accounting rewards accuracy, deadline discipline, and the integrity to say no. A small error or a quiet shortcut can become a serious problem."
    },
    reflections: [
      "Describe a time you caught your own mistake before it mattered. How?",
      "After seeing real accounting work, how do you feel about deadline-heavy detail work?",
      "Does sustained precision under deadline pressure suit you? Be honest."
    ],
    scenarioA: scenario(
      "A manager asks you to 'adjust' a figure to look better for a client. What do you do?",
      [
        { id: "a", label: "Decline and explain why the numbers must stay accurate", signals: { rigor: 3, ownership: 3, communication: 2 } },
        { id: "b", label: "Do it quietly to avoid conflict", signals: { rigor: 0, ownership: 0 } }
      ],
      "You protected the integrity of the numbers. Saying no is part of the job."
    ),
    scenarioB: scenario(
      "It's filing deadline day and you find an inconsistency. What now?",
      [
        { id: "a", label: "Stay calm, trace it, and fix it before filing", signals: { composure: 3, rigor: 3, ownership: 2 } },
        { id: "b", label: "File anyway to hit the deadline", signals: { rigor: 0, ownership: 0 } }
      ],
      "You filed clean under deadline pressure. Accuracy beats speed when it counts."
    ),
    evidence: { prompt: "Record a 60-second explanation of how you'd organise a simple monthly budget.", kind: "audio" },
    panoramaCaption: "Drag to look around an accounting firm."
  },
  {
    slug: "digital-marketer-reality",
    title: "Digital Marketer — Career Reality Program",
    summary: "Create, measure, and adapt campaigns fast — the data-and-creativity reality of marketing.",
    dayInLife: {
      heading: "Creativity that's measured",
      markdown:
        "Marketing blends creative ideas with hard metrics and fast pivots. A campaign that doesn't perform must change — quickly and without ego."
    },
    reflections: [
      "Describe a time you tried to persuade or promote something. What worked or didn't?",
      "After seeing real campaign work, how do you feel about being judged on numbers?",
      "Does adapting fast when data says you're wrong suit you? Be honest."
    ],
    scenarioA: scenario(
      "Your campaign is underperforming halfway through its budget. What do you do?",
      [
        { id: "a", label: "Analyse the data and pivot the approach", signals: { adaptability: 3, rigor: 2, ownership: 2 } },
        { id: "b", label: "Keep spending and hope it turns around", signals: { adaptability: 0, rigor: 0 } }
      ],
      "You read the data and adjusted before wasting budget. Marketers who can't pivot don't last."
    ),
    scenarioB: scenario(
      "A post you wrote gets strong negative comments. How do you respond?",
      [
        { id: "a", label: "Stay composed, respond professionally, learn from it", signals: { composure: 3, communication: 3 } },
        { id: "b", label: "Delete it and pretend it didn't happen", signals: { ownership: 0, communication: 1 } }
      ],
      "You handled public criticism with composure. Reputation is managed in those moments."
    ),
    evidence: { prompt: "Record a 60-second pitch promoting any product or idea you care about.", kind: "video" },
    panoramaCaption: "Drag to look around a marketing team's office."
  },
  {
    slug: "lawyer-reality",
    title: "Lawyer — Career Reality Program",
    summary: "Reason rigorously, argue clearly, and handle pressure the way practising lawyers do.",
    dayInLife: {
      heading: "Argument and detail",
      markdown:
        "Law is dense reading, precise reasoning, and clear argument under pressure. Most of it is preparation, not courtroom drama."
    },
    reflections: [
      "Describe a time you argued a point and changed someone's mind. How did you build the case?",
      "After seeing real legal work, how do you feel about heavy reading and detail?",
      "Does constructing careful arguments under pressure suit you? Be honest."
    ],
    scenarioA: scenario(
      "You spot a weakness in your own argument the night before a hearing. What do you do?",
      [
        { id: "a", label: "Address it head-on and prepare a counter", signals: { rigor: 3, ownership: 3, composure: 2 } },
        { id: "b", label: "Ignore it and hope the other side misses it", signals: { rigor: 0, ownership: 0 } }
      ],
      "You strengthened your case by confronting its weakness. Rigour wins cases."
    ),
    scenarioB: scenario(
      "Opposing counsel makes an aggressive point that rattles you. How do you respond?",
      [
        { id: "a", label: "Stay composed and respond with reasoning, not emotion", signals: { composure: 3, communication: 3 } },
        { id: "b", label: "React defensively and lose your thread", signals: { composure: 0, communication: 0 } }
      ],
      "You kept composure and answered with substance. Calm reasoning is persuasive."
    ),
    evidence: { prompt: "Record a 60-second argument for or against any everyday rule, with clear reasons.", kind: "audio" },
    panoramaCaption: "Drag to look around a law office."
  },
  {
    slug: "nurse-reality",
    title: "Nurse — Career Reality Program",
    summary: "Care, communicate, and stay steady under pressure — the daily reality of nursing.",
    dayInLife: {
      heading: "Care under pressure",
      markdown:
        "Nursing is constant prioritisation, compassion, and composure across long shifts. You manage many needs at once without losing care for each person."
    },
    reflections: [
      "Describe a time you cared for someone who was unwell or upset. What did you do?",
      "After seeing a real ward, how do you feel about the pace and emotional load?",
      "Does staying compassionate while under pressure suit you? Be honest."
    ],
    scenarioA: scenario(
      "Three patients need you at once and one is clearly more urgent. What do you do?",
      [
        { id: "a", label: "Prioritise the urgent patient and communicate with the others", signals: { rigor: 2, composure: 3, communication: 2, ownership: 2 } },
        { id: "b", label: "Help them in the order they asked", signals: { rigor: 0, composure: 1 } }
      ],
      "You prioritised by need and kept everyone informed. That is safe, humane nursing."
    ),
    scenarioB: scenario(
      "A frightened patient is refusing medication. How do you respond?",
      [
        { id: "a", label: "Reassure them, explain gently, and involve the doctor if needed", signals: { communication: 3, composure: 2, ownership: 2 } },
        { id: "b", label: "Force the issue to save time", signals: { communication: 0, composure: 0 } }
      ],
      "You earned trust and kept the patient safe. Compassion is clinical skill."
    ),
    evidence: { prompt: "Record a 60-second calm explanation reassuring a nervous patient about a procedure.", kind: "audio" },
    panoramaCaption: "Drag to look around a hospital ward."
  }
];

function buildDays(spec: CareerSpec): DaySeed[] {
  const panorama = `https://picsum.photos/seed/${spec.slug}/2400/1200`;
  return [
    {
      title: "A Day in the Life",
      objective: `Understand what a ${spec.title.split(" —")[0].toLowerCase()} actually does day to day.`,
      estimatedMinutes: 30,
      modules: [
        { type: "lesson", title: "The real rhythm", blocks: [{ kind: "text", body: spec.dayInLife }] },
        {
          type: "reflection",
          title: "First reflection",
          blocks: [{ kind: "task_prompt", body: { prompt: spec.reflections[0], evidenceKind: "text" } }]
        }
      ]
    },
    {
      title: "Core Challenge",
      objective: "Make a real decision under pressure and see what it signals.",
      estimatedMinutes: 35,
      modules: [
        { type: "scenario", title: "Decision under pressure", blocks: [{ kind: "scenario", scenarioGraph: spec.scenarioA }] }
      ]
    },
    {
      title: "On the Ground",
      objective: "See the real environment and reflect on the day-to-day reality.",
      estimatedMinutes: 30,
      modules: [
        {
          type: "lesson",
          title: "Look around",
          blocks: [{ kind: "panorama360", body: { heading: "The environment", src: panorama, caption: spec.panoramaCaption } }]
        },
        {
          type: "reflection",
          title: "Reflection",
          blocks: [{ kind: "task_prompt", body: { prompt: spec.reflections[1], evidenceKind: "text" } }]
        }
      ]
    },
    {
      title: "Show Your Work",
      objective: "Produce real evidence of how you'd handle the work.",
      estimatedMinutes: 25,
      modules: [
        {
          type: "task",
          title: "Submit evidence",
          blocks: [{ kind: "task_prompt", body: { prompt: spec.evidence.prompt, evidenceKind: spec.evidence.kind } }]
        }
      ]
    },
    {
      title: "Reality Check",
      objective: "Handle one more real situation, then decide if this fits you.",
      estimatedMinutes: 35,
      modules: [
        { type: "scenario", title: "One more call", blocks: [{ kind: "scenario", scenarioGraph: spec.scenarioB }] },
        {
          type: "reflection",
          title: "Final reflection",
          blocks: [{ kind: "task_prompt", body: { prompt: spec.reflections[2], evidenceKind: "text" } }]
        }
      ]
    }
  ];
}

async function seedCareer(spec: CareerSpec): Promise<void> {
  await prisma.experienceProgram.deleteMany({ where: { slug: spec.slug } });

  const program = await prisma.experienceProgram.create({
    data: { slug: spec.slug, title: spec.title, summary: spec.summary, status: "published" }
  });

  const days = buildDays(spec);
  const version = await prisma.programVersion.create({
    data: {
      programId: program.id,
      version: 1,
      state: "published",
      durationDays: days.length,
      generationSource: "human",
      promptVersion: "seed-multi-v1",
      publishedAt: new Date(),
      rubric: {
        create: {
          dimensionsJson: DIMENSIONS as Prisma.InputJsonValue,
          scaleJson: { min: 0, max: 100, bands: ["emerging", "developing", "strong", "exceptional"] } as Prisma.InputJsonValue
        }
      },
      days: {
        create: days.map((day, dayIdx) => ({
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

  console.log(`  ✓ ${spec.slug} (${days.length} days)`);
}

async function main(): Promise<void> {
  console.log(`Seeding ${CAREERS.length} career programs...`);
  for (const spec of CAREERS) {
    await seedCareer(spec);
  }
  console.log(`Seeded ${CAREERS.length} career programs.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
