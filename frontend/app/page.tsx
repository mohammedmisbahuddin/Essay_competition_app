'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('Home page - loading:', loading, 'user:', user);
    if (!loading) {
      if (user) {
        console.log('User found, redirecting based on role:', user.role);
        // Redirect based on user role
        switch (user.role) {
          case 'admin':
            console.log('Redirecting to admin dashboard');
            router.push('/admin/dashboard');
            break;
          case 'registration_desk':
            router.push('/registration');
            break;
          case 'invigilator':
            router.push('/invigilator');
            break;
          case 'evaluator':
            router.push('/evaluator');
            break;
          default:
            router.push('/login');
        }
      } else {
        console.log('No user found, redirecting to login');
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return null;
}

