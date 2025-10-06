'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  LocalUserChoices,
  PreJoin,
  RoomContext,
  VideoConference,
  ControlBar,
  Chat,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
} from '@livekit/components-react';
import {
  Room,
  RoomConnectOptions,
  RoomEvent,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Track,
  Participant,
  ConnectionState,
} from 'livekit-client';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ConnectionDetails } from '@/lib/types';
import { TranslationSettings } from '@/lib/TranslationControls';

const CONN_DETAILS_ENDPOINT = '/api/connection-details';
// Hardcoded room ID for bot integration
const HARDCODED_ROOM_ID = 'knect-translation-room';

// Custom translation button component
function TranslationButton({ 
  isActive, 
  isLoading, 
  onClick, 
  disabled 
}: { 
  isActive: boolean; 
  isLoading: boolean; 
  onClick: () => void; 
  disabled: boolean;
}) {
  return (
    <button
      className={`lk-button ${isActive ? 'lk-button-active' : ''} translation-button`}
      onClick={onClick}
      disabled={disabled || isLoading}
      title="Live Translation"
    >
      {isLoading ? (
        <span className="loading-indicator">Loading...</span>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8l6 6"></path>
            <path d="M4 14l6-6 2-3"></path>
            <path d="M2 5h12"></path>
            <path d="M7 2h1"></path>
            <path d="M22 22l-5-10-5 10"></path>
            <path d="M14 18h6"></path>
          </svg>
          <span>Translation</span>
        </>
      )}
    </button>
  );
}

export function PageClientImpl(props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [preJoinChoices, setPreJoinChoices] = useState<LocalUserChoices | undefined>(undefined);
  const [translationSettings, setTranslationSettings] = useState<TranslationSettings>(() => {
    console.debug('[PageClientImpl] Initializing translation settings');
    const settingsStr = searchParams.get('settings');
    const username = searchParams.get('username');
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        console.debug('[PageClientImpl] Parsed settings from URL:', settings);
        if (username) {
          console.debug('[PageClientImpl] Username found, will auto-connect');
          // Queue auto-connect after component mount
          queueMicrotask(() => {
            console.debug('[PageClientImpl] Auto-connecting with username:', username);
            handlePreJoinSubmit({
              username,
              audioEnabled: true,
              videoEnabled: true,
              audioDeviceId: '',
              videoDeviceId: '',
            });
          });
        }
        return settings;
      } catch (e) {
        console.error('[PageClientImpl] Failed to parse translation settings:', e);
      }
    }
    console.debug('[PageClientImpl] Using default translation settings');
    return {
      inputLang: 'en',
      outputLang: 'hi',
      gender: 'female',
    };
  });
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | undefined>(undefined);

  const handlePreJoinSubmit = useCallback(
    async (values: LocalUserChoices) => {
      console.debug('[PageClientImpl] Pre-join submit with values:', values);
      setPreJoinChoices(values);
      
      // Always use the hardcoded room ID instead of the dynamic one
      const roomName = HARDCODED_ROOM_ID;
      console.debug(`[PageClientImpl] Using hardcoded room ID: ${roomName}`);
      
      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
      url.searchParams.append('roomName', roomName);
      url.searchParams.append('participantName', values.username);
      
      const metadata = JSON.stringify(translationSettings);
      url.searchParams.append('metadata', metadata);

      if (props.region) {
        url.searchParams.append('region', props.region);
      }

      try {
        console.debug('[PageClientImpl] Fetching connection details');
        const connectionDetailsResp = await fetch(url.toString());
        if (!connectionDetailsResp.ok) {
          const errorText = await connectionDetailsResp.text();
          throw new Error(`Failed to get connection details: ${errorText}`);
        }
        const connectionDetailsData = await connectionDetailsResp.json();
        console.debug('[PageClientImpl] Received connection details');
        setConnectionDetails(connectionDetailsData);
      } catch (error) {
        console.error('[PageClientImpl] Connection error:', error);
        alert('Could not connect to the room. Check the server logs for more details.');
      }
    },
    [translationSettings],
  );

  return (
    <main data-lk-theme="default" style={{ height: '100%' }}>
      {connectionDetails === undefined || preJoinChoices === undefined ? (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <PreJoin
            onSubmit={handlePreJoinSubmit}
            defaults={{
              username: searchParams.get('username') || '',
              videoEnabled: true,
              audioEnabled: true,
              audioDeviceId: '',
              videoDeviceId: '',
            }}
          />
        </div>
      ) : (
        <VideoConferenceComponent
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          hq={props.hq}
          codec={props.codec}
          translationSettings={translationSettings}
        />
      )}
    </main>
  );
}

function VideoConferenceComponent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  hq: boolean;
  codec: VideoCodec;
  translationSettings: TranslationSettings;
}) {
  const router = useRouter();
  const [isTranslationActive, setIsTranslationActive] = useState(false);
  const [isTranslationLoading, setIsTranslationLoading] = useState(false);
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);

  // Check if the current user is allowed to use translation (only 'dinu' for now)
  useEffect(() => {
    const username = props.userChoices.username.toLowerCase();
    const canUseTranslation = username === 'dinu';
    console.debug(`[VideoConferenceComponent] User ${username} ${canUseTranslation ? 'can' : 'cannot'} use translation`);
    setIsTranslationEnabled(canUseTranslation);
  }, [props.userChoices.username]);

  const roomOptions: RoomOptions = useMemo(() => {
    console.debug('[VideoConferenceComponent] Creating room options');
    return {
      publishDefaults: {
        videoSimulcastLayers: props.hq
          ? [VideoPresets.h1080, VideoPresets.h720]
          : [VideoPresets.h540, VideoPresets.h216],
        videoCodec: props.codec,
      },
      adaptiveStream: true,
      dynacast: true,
    };
  }, [props.hq, props.codec]);

  const room = useMemo(() => {
    console.debug('[VideoConferenceComponent] Creating new Room instance');
    const newRoom = new Room(roomOptions);
    
    // Add room event listeners for debugging
    newRoom.on(RoomEvent.Connected, () => console.debug('[Room] Connected'));
    newRoom.on(RoomEvent.Disconnected, () => console.debug('[Room] Disconnected'));
    newRoom.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => 
      console.debug('[Room] Connection state changed:', state)
    );
    newRoom.on(RoomEvent.ParticipantConnected, (participant: Participant) => 
      console.debug('[Room] Participant connected:', participant.identity)
    );
    newRoom.on(RoomEvent.TrackSubscribed, (track: Track, publication, participant: Participant) => 
      console.debug('[Room] Track subscribed:', track.kind, 'from', participant.identity)
    );
    
    return newRoom;
  }, [roomOptions]);

  const handleOnLeave = useCallback(() => {
    console.debug('[VideoConferenceComponent] Handling leave');
    router.push('/');
  }, [router]);

  const toggleTranslation = useCallback(async () => {
    if (!isTranslationEnabled) return;
    
    if (!isTranslationActive) {
      setIsTranslationLoading(true);
      console.debug('[VideoConferenceComponent] Starting translation...');
      
      try {
        // Notify the bot to start translation with the user's settings
        const botNotifyUrl = '/api/notify-bot';
        const response = await fetch(botNotifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'start_translation',
            username: props.userChoices.username,
            settings: props.translationSettings,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to notify bot');
        }
        
        console.debug('[VideoConferenceComponent] Translation started successfully');
        setIsTranslationActive(true);
      } catch (error) {
        console.error('[VideoConferenceComponent] Failed to start translation:', error);
        alert('Failed to start translation. Please try again.');
      } finally {
        setIsTranslationLoading(false);
      }
    } else {
      console.debug('[VideoConferenceComponent] Stopping translation...');
      
      try {
        // Notify the bot to stop translation
        const botNotifyUrl = '/api/notify-bot';
        await fetch(botNotifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'stop_translation',
            username: props.userChoices.username,
          }),
        });
        
        console.debug('[VideoConferenceComponent] Translation stopped successfully');
      } catch (error) {
        console.error('[VideoConferenceComponent] Failed to stop translation:', error);
      }
      
      setIsTranslationActive(false);
    }
  }, [isTranslationActive, isTranslationEnabled, props.userChoices.username, props.translationSettings]);

  useEffect(() => {
    console.debug('[VideoConferenceComponent] Setting up room connection');
    const connectOptions: RoomConnectOptions = { autoSubscribe: true };

    room
      .connect(props.connectionDetails.serverUrl, props.connectionDetails.participantToken, connectOptions)
      .then(async () => {
        console.debug('[VideoConferenceComponent] Room connected, enabling devices');
        if (props.userChoices.videoEnabled) {
          await room.localParticipant.setCameraEnabled(true);
        }
        if (props.userChoices.audioEnabled) {
          await room.localParticipant.setMicrophoneEnabled(true);
        }
      })
      .catch((error) => {
        console.error('[VideoConferenceComponent] Connection error:', error);
        alert('Failed to connect to the room.');
      });

    room.on(RoomEvent.Disconnected, handleOnLeave);
    return () => {
      console.debug('[VideoConferenceComponent] Cleaning up room connection');
      
      // Stop translation if active when leaving
      if (isTranslationActive) {
        fetch('/api/notify-bot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'stop_translation',
            username: props.userChoices.username,
          }),
        }).catch(error => {
          console.error('[VideoConferenceComponent] Failed to stop translation on cleanup:', error);
        });
      }
      
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.disconnect();
    };
  }, [room, props.connectionDetails, props.userChoices, handleOnLeave, isTranslationActive, props.userChoices.username]);

  // Custom control bar with translation button
  const CustomControlBar = () => (
    <ControlBar
      variation="minimal"
      controls={{
        camera: true,
        microphone: true,
        leave: true,
      }}
    >
      {isTranslationEnabled && (
        <TranslationButton
          isActive={isTranslationActive}
          isLoading={isTranslationLoading}
          onClick={toggleTranslation}
          disabled={!isTranslationEnabled}
        />
      )}
    </ControlBar>
  );

  return (
    <RoomContext.Provider value={room}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <VideoConference>
          <CustomControlBar />
        </VideoConference>
        <RoomAudioRenderer />
      </div>
    </RoomContext.Provider>
  );
}
