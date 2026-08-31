import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Brief — Préparez chaque call en 2 minutes",
  description:
    "Brief génère automatiquement des briefs pré-call personnalisés pour vos commerciaux.",
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    // iOS ignore les icônes du manifeste et ne lit QUE celle-ci pour l'écran
    // d'accueil. L'oublier donne une vignette de la page en guise d'icône.
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Brief",
    // « default » et non « black-translucent » : ce dernier fait passer le
    // contenu SOUS la barre d'état, ce qui demanderait de gérer les marges de
    // zone sûre sur chaque écran. Le jour où on le voudra, ce sera un chantier
    // à part entière, pas une ligne de configuration.
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <head>
        {/* Only consumed by pages/components using the .brief-ui class in
            globals.css — loading them here is the simplest option, and
            harmless since nothing else references these font families. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
