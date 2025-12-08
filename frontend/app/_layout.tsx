import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Keep the navigation bar hidden until the user swipes, while still allowing edge-to-edge.
    NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
    NavigationBar.setPositionAsync('absolute').catch(() => {});
    NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    NavigationBar.setBackgroundColorAsync('transparent').catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" translucent backgroundColor="transparent" />
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
