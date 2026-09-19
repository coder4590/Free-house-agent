import type {Metadata} from 'next';
import './globals.css'; // Global styles
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Sing Sing Restaurant OS - Owner\'s Control Panel',
  description: 'Owner\'s Control Panel for Sing Sing Beer & Pizza with dynamic AI Voice & Behavior Engine, Interactive Floor Plan Builder, Menu Matrix CRUD, and Live Operations.',
  openGraph: {
    title: 'Sing Sing Restaurant OS - Owner\'s Control Panel',
    description: 'Owner\'s Control Panel for Sing Sing Beer & Pizza with dynamic AI Voice & Behavior Engine, Interactive Floor Plan Builder, Menu Matrix CRUD, and Live Operations.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sing Sing Restaurant OS - Owner\'s Control Panel',
    description: 'Owner\'s Control Panel for Sing Sing Beer & Pizza with dynamic AI Voice & Behavior Engine, Interactive Floor Plan Builder, Menu Matrix CRUD, and Live Operations.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
