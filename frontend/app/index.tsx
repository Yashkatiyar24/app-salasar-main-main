import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import LoadingSpinner from '../src/components/LoadingSpinner';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!user && inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (user && !inAuthGroup) {
      // Redirect to dashboard if authenticated
      router.replace('/dashboard');
    }
  }, [user, loading, segments]);

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  // Default redirect based on auth state
  if (!user) {
    router.replace('/login');
  } else {
    router.replace('/dashboard');
  }

  return <LoadingSpinner message="Redirecting..." />;
}
