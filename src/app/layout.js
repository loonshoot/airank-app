import '@/styles/globals.css';
import { Fira_Code } from 'next/font/google';
import { getServerSession } from 'next-auth/next';
import { Providers } from './providers';

// Use Fira Code font to match the Pages Router
const fira = Fira_Code({ 
  subsets: ['latin'],
  display: 'swap'
});

export const metadata = {
  title: 'Outrun',
  description: 'Outrun App',
};

export default async function RootLayout({ children }) {
  const session = await getServerSession();
  
  return (
    <html lang="en" className={fira.className}>
      <body className={fira.className}>
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
} 