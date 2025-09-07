/**
 * Wrapper pour éviter les erreurs Turbopack sur la page signin
 */

'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Chargement dynamique pour éviter les erreurs de module
const SignInPageComponent = dynamic(
  () => import('@/app/auth/signin/page').catch(() => {
    // Fallback en cas d'erreur de chargement
    return {
      default: () => (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white text-center">
            <h1 className="text-2xl font-bold mb-4">VidGenie</h1>
            <p className="text-gray-400">Chargement de la page de connexion...</p>
            <div className="mt-4">
              <a 
                href="/dashboard" 
                className="bg-white text-black px-6 py-2 rounded hover:bg-gray-200 transition-colors"
              >
                Accéder au dashboard (dev)
              </a>
            </div>
          </div>
        </div>
      )
    };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-pulse">
            <h1 className="text-2xl font-bold mb-4">VidGenie</h1>
            <p className="text-gray-400">Initialisation...</p>
          </div>
        </div>
      </div>
    ),
  }
);

export default function SignInWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white text-center">
            <h1 className="text-2xl font-bold mb-4">VidGenie</h1>
            <p className="text-gray-400">Chargement...</p>
          </div>
        </div>
      }
    >
      <SignInPageComponent />
    </Suspense>
  );
}