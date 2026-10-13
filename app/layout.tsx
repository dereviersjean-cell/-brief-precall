import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
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

// Geist, la police du site public, pour toute l'app (refonte visuelle
// d'octobre 2026). Exposée en variable CSS, lue par --marketing-sans.
const brief = Geist({ subsets: ["latin"], variable: "--font-brief", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`h-full ${brief.variable}`}>
      <body className="min-h-full flex flex-col bg-background text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
