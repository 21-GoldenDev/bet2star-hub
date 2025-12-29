import React, { Suspense } from 'react';
import AuthCallbackClient from './AuthCallbackClient';

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p>Authenticating...</p>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
