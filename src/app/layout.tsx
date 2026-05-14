import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { FloatingBackButton } from "@/components/floating-back-button";

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const APP_URL = "https://wycenka.pl";
const APP_NAME = "WYCENKA";
const APP_DESCRIPTION = "Profesjonalny system wycen usług hydraulicznych. Twórz wyceny, zarządzaj klientami, materiałami i fakturami w jednym miejscu.";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} - System wycen usług hydraulicznych`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "wycena usług",
    "hydraulika",
    "system wycen",
    "faktury",
    "wycena instalacji",
    "kosztorys",
    "usługi hydrauliczne",
    "zarządzanie klientami",
    "program dla hydraulika",
  ],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  publisher: APP_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} - System wycen usług hydraulicznych`,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${APP_NAME} - System wycen usług hydraulicznych`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} - System wycen usług hydraulicznych`,
    description: APP_DESCRIPTION,
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    canonical: APP_URL,
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: APP_NAME,
              description: APP_DESCRIPTION,
              url: APP_URL,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "PLN",
              },
              inLanguage: "pl",
            }),
          }}
        />
      </head>
      <body className={`${openSans.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <FloatingBackButton />
      </body>
    </html>
  );
}
