import { auth } from '@/auth';
import { redirect } from 'next/navigation';

const HomePage = async () => {
  const session = await auth();

  if (session?.user?.role === 'LANDLORD') redirect('/dashboard');
  if (session?.user?.role === 'TENANT') redirect('/profile');

  redirect('/auth/signin');
};

export default HomePage;

