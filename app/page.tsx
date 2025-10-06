'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { generateRoomId } from '../lib/client-utils';
import { TranslationControls, TranslationSettings } from '../lib/TranslationControls';
import styles from '../styles/Home.module.css';

export default function Page() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [translationSettings, setTranslationSettings] = useState<TranslationSettings>({
    inputLang: 'en',
    outputLang: 'hi',
    gender: 'female',
  });

  const handleTranslationSettingsChange = (newSettings: TranslationSettings) => {
    console.debug('[Page] Translation settings changed:', newSettings);
    setTranslationSettings(newSettings);
  };

  const startMeeting = () => {
    if (!username.trim()) {
      alert('Please enter your name');
      return;
    }
    const roomId = generateRoomId();
    const searchParams = new URLSearchParams({
      settings: JSON.stringify(translationSettings),
      username: username,
    });
    router.push(`/rooms/${roomId}?${searchParams.toString()}`);
  };

  return (
    <main className={styles.main} data-lk-theme="default">
      <div className="header">
        <img src="/images/livekit-meet-home.svg" alt="LiveKit Meet" width="360" height="45" />
        <h2>
          A simple video conferencing app for translation.
        </h2>
      </div>
      <div className="join-controls">
        <div className="control-group">
          <label htmlFor="username">Your Name</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="username-input"
            placeholder="Enter your name"
          />
        </div>
        <TranslationControls
          settings={translationSettings}
          onChange={handleTranslationSettingsChange}
        />
        <button
          style={{ marginTop: '1rem' }}
          className="lk-button"
          onClick={startMeeting}
          disabled={!username.trim()}
        >
          Start Meeting
        </button>
      </div>
    </main>
  );
}