import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Space Grotesk carries the personality in headings; Inter gets out of the way
// in dense admin tables; the mono face is reserved for data — counts, dates,
// skill slots — so numbers always look like numbers.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "ACM PDEU",
    template: "%s · ACM PDEU",
  },
  description:
    "The ACM PDEU student chapter's committee hub — member directory, skills, and hackathon team building.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {/* The ambient field every glass surface is composited over. Fixed and
            behind the content, so it drifts under the page rather than with it. */}
        <div aria-hidden className="aurora" />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
