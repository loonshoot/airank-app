import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export default async function Home() {
  const session = await getServerSession();
  
  // If logged in, redirect to account, otherwise to login
  if (session) {
    redirect('/account');
  } else {
    redirect('/auth/login');
  }
} 