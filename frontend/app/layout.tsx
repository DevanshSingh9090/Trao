import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Trao - AI Interview Prep Kit",
  description:
    "Personalised interview preparation kits generated from job descriptions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}