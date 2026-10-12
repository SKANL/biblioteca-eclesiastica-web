import type { Metadata, Viewport } from "next";
import { EB_Garamond, Source_Sans_3 } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
import "./globals.css";

const serif = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const sans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Biblioteca Virtual Eclesiástica",
    template: "%s | Biblioteca Virtual Eclesiástica",
  },
  description:
    "Busca un pasaje en el catálogo, lee la página completa y genera su cita bibliográfica.",
  applicationName: "Biblioteca Virtual Eclesiástica",
  appleWebApp: {
    capable: true,
    title: "Biblioteca Eclesiástica",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#121716" },
  ],
  colorScheme: "light dark",
};

// Applies saved theme and text size before first paint (no flash). Keys: lib/prefs.ts PREF.
const PREFS_SCRIPT = `try{var d=document.documentElement,t=localStorage.getItem("bve:tema"),s=localStorage.getItem("bve:texto");if(t==="light"||t==="dark")d.dataset.theme=t;if(/^[0-9.]{1,5}$/.test(s||""))d.style.setProperty("--reader-scale",s)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${serif.variable} ${sans.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-ink"
        >
          Ir al contenido
        </a>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
