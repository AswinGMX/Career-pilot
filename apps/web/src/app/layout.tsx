import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Career Pilot",
  description: "AI-guided career discovery, proof sessions, and reporting for students, parents, and schools"
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
