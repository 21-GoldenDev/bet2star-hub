'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';
import useSupabaseUser from '@/hooks/use-supabase-user';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, user } = useSupabaseUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user !== null) {
      router.push("/");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return <Loading />;
  }
  return children;
}
