# Career Pilot

## Production Rebuild In Progress

This repository now contains two parallel tracks:

- `apps/*` and `packages/*`: the new production monorepo scaffold
- root-level Vite and Node files: the legacy prototype kept for reference during the rebuild

Core planning documents:

- `docs/architecture.md`
- `docs/backend-api-db-schema.md`
- `docs/frontend-architecture.md`
- `docs/rebuild-roadmap.md`
- `docs/legacy-prototype.md`
- `docs/production-cutover-checklist.md`
- `docs/staging-signoff.md`
- `docs/production-rollout-plan.md`
- `docs/rollback-plan.md`
- `docs/prototype-decommission-plan.md`
- `docs/local-testing-guide.md`

Use the new workspace for all production implementation work.

Local review flow:

1. `pnpm infra:local:start`
2. `pnpm setup:local`
3. `pnpm dev`

If the default local ports are busy, `pnpm dev` will pick the next open ones and print the active URLs.

## Default Runtime

The default runtime is the production monorepo:

- `apps/web`
- `apps/api`
- `apps/worker`

Use root-level scripts only for legacy reference. They are not the deployment target.

## Legacy Prototype Overview

# 🚀 Career Reality – Try Before You Choose

## 💡 One-Line Pitch
A gamified career discovery platform where students **experience real-world career scenarios** and are evaluated based on their behavior—before choosing a career.

---

## 🎯 Problem Statement

Students today choose careers based on:
- Trends (“Everyone is doing IT”)
- Peer pressure
- Parental influence
- Lack of real-world exposure

### ❗ Core Problem:
> Students don’t truly understand what a career involves—its challenges, responsibilities, and required mindset.

### ⚠️ Impact:
- Wrong career choices  
- Lack of satisfaction  
- Career switches later  
- Wasted time and effort  

---

## 🧠 Key Insight

> “Interest tells what you like. Behavior shows what you are built for.”

Students may *like* something, but that doesn’t mean they are:
- Naturally suited  
- Behaviorally aligned  
- Mentally prepared  

---

## 💥 Solution

Career Reality is a platform that:

> **Simulates real-world career situations and evaluates how students think, behave, and respond—before suggesting career paths.**

---

## 🚀 Your Unique Edge

Unlike platforms like :contentReference[oaicite:0]{index=0} or :contentReference[oaicite:1]{index=1}:

| Traditional Platforms | Career Reality |
|----------------------|---------------|
| Suggest careers      | Simulate careers |
| One-time quiz        | Behavioral evaluation |
| Theoretical          | Real-world experience |
| Interest-based       | Behavior + potential based |

---

## 🧩 Hackathon MVP (2-Day Build)

### 1. 👤 Smart Profile Builder
- Interests (UI cards)  
- Hobbies  
- Personality sliders (introvert/extrovert, creative/logical)  

👉 **Output:** User Persona

---

### 2. 🤖 Career Suggestion Engine
- Rule-based logic (fast + simple)  

**Examples:**
- Likes organizing → Interior Designer  
- Likes problem solving → Software Engineer  

👉 **Output:** Top 3–5 Career Paths

---

### 3. 🧪 Career Reality Simulation (HERO FEATURE)

Instead of long programs → **10-minute real-world experience**

#### 🔹 Example: Interior Designer
- Arrange a messy room (drag-drop)  
- Handle budget constraints  
- Resolve client conflicts  

👉 This is not just interaction—it’s **decision-making under pressure**

---

### 4. 🧠 Behavioral Evaluation Engine

System tracks:
- Decision-making style  
- Problem-solving ability  
- Creativity  
- Patience & stress handling  

👉 This is your **core innovation**

---

### 5. 📊 Feedback Dashboard

After simulation:

- ✅ Strengths  
- ⚠️ Improvement areas  
- 🎯 Career Fit Score (%)  
- 🚀 Growth Potential  

**Example Output:**
> “You show strong creativity but struggle with time constraints.”

---

### 6. 👨‍👩‍👧 Parent View (High Impact)

- Shareable report link  
- Clear insights for parents  
- Enables **collaborative decision-making**

---

### 7. 👨‍🏫 Mentor Layer (Optional Demo)

- “Book a session” button  
- Mock mentor profiles  

---

## 🧠 System Flow
User Input → Profile Builder → Rule Engine → Career Suggestions
↓
Simulation Engine
↓
Behavior Analysis
↓
Report + Parent Dashboard


---

## 🧪 Example Use Case

### Student Says:
“I like coding”

### Traditional Platforms:
→ Suggest Software Engineer

### Career Reality:
- Debugging challenge  
- Deadline-based task  
- Ambiguous requirement  

### Output:
> “You have strong analytical skills but need improvement in patience and handling ambiguity.”

---

## 💎 What Makes Us Stand Out

- 🧠 Behavior-based evaluation (not just quizzes)  
- 🎮 Gamified but meaningful simulations  
- 📊 Data-driven insights  
- 👨‍👩‍👧 Parent-inclusive approach  
- 🚀 “Try Before You Choose” concept  

---

## 📈 Impact

- Better career decisions  
- Reduced career regret  
- Increased self-awareness  
- Stronger parent-student alignment  
- Early exposure to real-world careers  

---

## 🌍 Target Users

- School students (Grade 9–12)  
- College students (early stage)  
- Parents  
- Schools & institutions  

---

## 🏗️ Tech Stack

- **Frontend:** React / Next.js  
- **Backend:** Node.js / Firebase  
- **AI (optional):** OpenAI (for insights)  
- **UI:** Tailwind CSS  

---

## Local Setup

### Prerequisites

- Node.js 18+  
- npm  

### 1. Clone the project

```bash
git clone <your-repo-url>
cd Career-pilot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the project

```bash
npm run build
```

### 4. Start the application locally

```bash
npm start
```

### 5. Open in browser

```text
http://127.0.0.1:3000
```

### Useful commands

Typecheck:

```bash
npm run typecheck
```

Development mode:

```bash
npm run dev
```

---

## ⚠️ Reality Check (Important for Judges)

❌ Don’t say:  
“We built a full AI psychological system”

✅ Say:  
“We built a working prototype of a simulation-based career discovery system”

---

## 🚀 Future Scope

- 7–10 day deep career simulations  
- AI-driven behavioral tracking  
- Real mentor integration  
- School partnerships  
- Long-term career guidance system  

---

## 🧠 Vision

> “To ensure every student chooses a career based on real understanding—not assumptions.”

---

## 🎤 Final Closing Line

> “We don’t just ask students what they like—we let them experience careers, observe how they perform, and guide them to what truly fits them.”
