'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Get the redirect URL from query params, default to home
        const redirectTo = searchParams.get('redirectTo') || '/';
        router.push(redirectTo);
      } else {
        router.push('/auth');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Authenticating...</p>
    </div>
  );
}
