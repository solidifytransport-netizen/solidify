import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { SITE_URL, COMPANY, META } from "@/lib/site";
import { organizationLd } from "@/lib/seo";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Header } from "@/components/layout/Header";
import { BackToTop } from "@/components/layout/BackToTop";
import { Cursor } from "@/components/ui/Cursor";
import { JsonLd } from "@/components/layout/JsonLd";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: META.defaultTitle, template: META.titleTemplate },
  description: META.description,
  keywords: [...META.keywords],
  authors: [{ name: COMPANY.legalName }],
  creator: COMPANY.legalName,
  applicationName: COMPANY.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: COMPANY.name,
    title: META.defaultTitle,
    description: META.description,
  },
  twitter: { card: "summary_large_image", title: META.defaultTitle, description: META.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  category: "business",
};

export const viewport: Viewport = {
  themeColor: "#080b12",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontVariables} no-js`} suppressHydrationWarning>
      <head>
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <JsonLd data={organizationLd()} />
        <SmoothScroll>
          <Cursor />
          <Header />
          <main id="main">{children}</main>
          <BackToTop />
        </SmoothScroll>
      </body>
    </html>
  );
}
