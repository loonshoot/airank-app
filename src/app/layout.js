import '@/styles/globals.css';
import { Inter } from 'next/font/google';
import { getServerSession } from 'next-auth/next';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'AI Rank',
  description: 'AI Rank App',
};

export default async function RootLayout({ children }) {
  const session = await getServerSession();

  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className={inter.className}>
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
} 