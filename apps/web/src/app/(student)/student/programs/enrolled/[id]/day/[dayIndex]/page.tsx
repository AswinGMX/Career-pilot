import Link from "next/link";

import { getEnrollmentDay } from "@/lib/api";
import { AppPage, Hero, SurfaceCard } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireStudent } from "@/lib/session";

import { DayRunner } from "./DayRunner";

export const dynamic = "force-dynamic";

export default async function ProgramDayPage({
  params
}: {
  params: { id: string; dayIndex: string };
}): Promise<JSX.Element> {
  await requireStudent();
  const cookie = getServerSessionCookieHeader();
  const result = await getEnrollmentDay(params.id, Number(params.dayIndex), cookie);

  if (!result || !result.day) {
    return (
      <AppPage>
        <Hero
          eyebrow="Day"
          title="This day isn't available yet"
          subtitle={<p style={{ margin: 0 }}>Complete the earlier days to unlock it.</p>}
        />
        <SurfaceCard>
          <Link href={`/student/programs/enrolled/${params.id}`}>← Back to program</Link>
        </SurfaceCard>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <Hero
        eyebrow={`Day ${result.day.dayIndex} of ${result.enrollment.durationDays} · ${result.enrollment.programTitle}`}
        title={result.day.title}
        subtitle={<p style={{ margin: 0 }}>{result.day.objective}</p>}
      />
      <DayRunner enrollmentId={params.id} day={result.day} />
    </AppPage>
  );
}
