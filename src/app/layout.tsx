import type { Metadata } from 'next';
import { Inter, Poppins, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { LazyWrapper } from '@/components/lazy/LazyWrapper';
// import { LazyAccessibilityChecker } from '@/components/lazy'; // Temporarily commented out due to export issues

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const _poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Vidgenie - Automatisez votre contenu viral',
  description: 'Créez et publiez des vidéos TikTok, YouTube Shorts et Instagram Reels automatiquement avec l\'IA',
  keywords: ['content creation', 'AI', 'TikTok', 'YouTube Shorts', 'Instagram Reels', 'automation'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
          {/* <LazyWrapper name="accessibility checker" retryable={false}>
            <LazyAccessibilityChecker />
          </LazyWrapper> */}
        </Providers>
      </body>
    </html>
  );
}
