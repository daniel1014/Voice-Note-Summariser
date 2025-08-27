'use client';

import { useState } from 'react';
import LoginForm from '@/components/LoginForm';
import VoiceNoteSummarizer from '@/components/VoiceNoteSummarizer';

interface User {
  id: string;
  username: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (username: string, password: string) => {
    try {
      setLoginError(null);
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setLoginError(null);
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} error={loginError} />;
  }

  return <VoiceNoteSummarizer user={user} onLogout={handleLogout} />;
}
