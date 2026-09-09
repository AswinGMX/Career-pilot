import { getAccount, getAccountOptions } from "@/lib/api";
import { AppPage, Hero } from "@/components/page-chrome";
import { getServerSessionCookieHeader, requireSession } from "@/lib/session";

import { AccountSettings } from "./AccountSettings";

export const dynamic = "force-dynamic";

export default async function AccountPage(): Promise<JSX.Element> {
  await requireSession();
  const cookieHeader = getServerSessionCookieHeader();

  // Options are a convenience for the pickers; a failure there must not take
  // the whole settings page down, so it degrades to free-text entry.
  const [{ account }, options] = await Promise.all([
    getAccount(cookieHeader),
    getAccountOptions(cookieHeader).catch(() => ({ timezones: [], locales: [] }))
  ]);

  // Formatted here, on the server, so the client renders a fixed string. The
  // account's own locale wins; without one this falls back to the server's
  // default rather than the viewer's, which is precisely what setting a locale
  // fixes.
  const memberSince = new Date(account.createdAt).toLocaleDateString(account.locale || undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <AppPage>
      <Hero
        eyebrow="Account"
        title="Your account"
        subtitle={<p style={{ margin: 0 }}>Your name, how you sign in, and how dates and times are shown to you.</p>}
      />
      <AccountSettings account={account} options={options} memberSince={memberSince} />
    </AppPage>
  );
}
