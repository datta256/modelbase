import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site-config";
import { Suspense } from "react";
import NavigationLoader from "@/components/NavigationLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Free 3D Models | Download 10,000+ GLB OBJ GLTF Assets",
    template: "%s | ModelBase",
  },
  description: "Download free 3D models for Blender, Unity, Unreal Engine, game development, 3D printing, animation, and VR/AR. 10,000+ GLB, OBJ, GLTF, FBX formats. No registration required.",
  keywords: [
    // Core 3D searches
    "free 3d models",
    "3d model download",
    "3d models free",
    "download 3d models",
    "3d model library",
    "3d assets free",
    // Formats
    "free glb models",
    "free obj models",
    "free gltf models",
    "free fbx models",
    // Software
    "blender models free",
    "blender 3d models",
    "unity 3d models",
    "unreal engine assets",
    "unreal engine free assets",
    "maya models free",
    "3ds max models",
    // Use cases
    "free game assets",
    "game 3d models",
    "3d printing models",
    "3d printable models",
    "vr 3d models",
    "ar 3d models",
    "low poly models",
    "3d character models free",
    "3d architecture models",
    "3d furniture models",
    "3d vehicle models",
    "3d animal models",
    "3d prop models",
    // Long-tail
    "free 3d models for commercial use",
    "free rigged 3d models",
    "free animated 3d models",
    "free pbr 3d models",
    "free textured 3d models"
  ],
  authors: [{ name: "ModelBase" }],
  creator: "ModelBase",
  publisher: "ModelBase",
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
    locale: "en_US",
    url: SITE_URL,
    siteName: "ModelBase",
    title: "Free 3D Models | Download 10,000+ GLB OBJ GLTF Assets",
    description: "Download 10,000+ free 3D models for Blender, Unity, Unreal, game dev, 3D printing. GLB, OBJ, GLTF, FBX formats. No registration.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ModelBase - Free 3D Models Library",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free 3D Models | Download 10,000+ Assets",
    description: "10,000+ free 3D models for Blender, Unity, Unreal. Instant download, no registration.",
    images: ["/og-image.jpg"],
    creator: "@modelbase",
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      "url": SITE_URL,
      "name": "ModelBase",
      "description": "Free 3D Models Library - Download 10,000+ GLB OBJ GLTF FBX Assets",
      "publisher": {
        "@id": `${SITE_URL}/#organization`
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${SITE_URL}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      "name": "ModelBase",
      "url": SITE_URL,
      "logo": {
        "@type": "ImageObject",
        "@id": `${SITE_URL}/#logo`,
        "url": `${SITE_URL}/logo.png`,
        "contentUrl": `${SITE_URL}/logo.png`,
        "width": 512,
        "height": 512,
        "caption": "ModelBase - Free 3D Models"
      },
      "image": {
        "@id": `${SITE_URL}/#logo`
      },
      "sameAs": [
        "https://twitter.com/modelbase"
      ]
    },
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://media.sketchfab.com" />
        <link rel="dns-prefetch" href="https://media.sketchfab.com" />
        <link rel="dns-prefetch" href="https://huggingface.co" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <NavigationLoader />
        </Suspense>
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50"
        >
          Skip to main content
        </a>
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
