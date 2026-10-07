import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PSYSTEM — Tecnologia para saúde mental",
    template: "%s · PSYSTEM",
  },
  description:
    "Agenda, prontuário, financeiro e documentos para psicólogos e clínicas.",
  openGraph: {
    siteName: "PSYSTEM",
    images: ["/brand/psystem/social.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
