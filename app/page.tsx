'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { generateRoomId } from '@/lib/client-utils';
import styles from '../styles/Home.module.css';

export default function Page() {
  const router = useRouter();
  const startMeeting = () => {
    router.push(`/rooms/${generateRoomId()}`);
  };

  return (
    <main className={styles.main} data-lk-theme="default">
      <div className="header">
        <img src="/images/livekit-meet-home.svg" alt="LiveKit Meet" width="360" height="45" />
        <h2>
          A simple video conferencing app.
        </h2>
      </div>
      <button style={{ marginTop: '1rem' }} className="lk-button" onClick={startMeeting}>
        Start Meeting
      </button>
    </main>
  );
}