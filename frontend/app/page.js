'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') return;
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/chat');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h1>
        <p className="text-gray-600">Redirecting you to the app</p>
      </div>
    </div>
  );
}
