import type { Metadata } from "next";
import "./globals.css";
import { Inter, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "@/components/auth-gate";
import { LanguageProvider } from "@/components/language-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "FünfSterne Admin",
  description: "Admin dashboard for FünfSterne",
};

// Sets lang/dir before React hydrates so there's no flash of the wrong
// direction on load. The storage key is duplicated here (rather than
// imported) because inline scripts can't import TS modules -- it must be
// kept in sync with LANGUAGE_STORAGE_KEY in lib/i18n.ts.
const ANTI_FLASH_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('funfsterne-admin-language');
    var lang = (stored === 'de' || stored === 'ar') ? stored : (navigator.language || '').slice(0, 2);
    if (lang !== 'de' && lang !== 'ar') lang = 'en';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("font-sans", inter.variable, playfair.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LanguageProvider>
            <AuthProvider>
              <AuthGate>{children}</AuthGate>
            </AuthProvider>
            <Toaster richColors position="top-right" />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
