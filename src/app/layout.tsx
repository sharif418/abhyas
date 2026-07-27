import type { Metadata, Viewport } from "next";
import { Noto_Sans_Bengali, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "অভ্যাস — স্বশাসন ও অভ্যাস ট্র্যাকার",
  description:
    "বাংলাদেশের ব্যবহারকারীদের জন্য সম্পূর্ণ বাংলা স্বশাসন ও অভ্যাস ট্র্যাকিং অ্যাপ। নামাজ, কুরআন, রোজা ট্র্যাকিং সহ অফলাইন-ফার্স্ট অভিজ্ঞতা।",
  keywords: [
    "অভ্যাস",
    "habit tracker",
    "বাংলা",
    "নামাজ",
    "কুরআন",
    "self discipline",
    "Bangladesh",
    "streak",
  ],
  authors: [{ name: "Abhyas" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "অভ্যাস",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "অভ্যাস — স্বশাসন ও অভ্যাস ট্র্যাকার",
    description:
      "সম্পূর্ণ বাংলা অভ্যাস ট্র্যাকার — নামাজ, কুরআন, স্ট্রিক ও গেমিফিকেশন সহ।",
    type: "website",
    locale: "bn_BD",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0fdf4" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body
        className={`${notoBengali.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "font-sans rounded-xl",
            },
          }}
        />
      </body>
    </html>
  );
}
