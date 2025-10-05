'use client';

import React from 'react';
import {
  LocalUserChoices,
  PreJoin,
  RoomContext,
  VideoConference,
} from '@livekit/components-react';
import {
  Room,
  RoomConnectOptions,
  RoomEvent,
  RoomOptions,
  VideoCodec,
} from 'livekit-client';
import { useRouter } from 'next/navigation';
import type { ConnectionDetails } from '/Users/dindayalsingh/Downloads/knect/meet/lib/types';

const CONN_DETAILS_ENDPOINT = '/api/connection-details';

// Component for our translation dropdowns
function TranslationControls({
  onChange,
}: {
  onChange: (selections: { inputLang: string; outputLang: string; gender: string }) => void;
}) {
  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ [name]: value } as any);
  };

  return (
    <div className="translation-controls">
      <div className="control-group">
        <label htmlFor="inputLang">Your Language</label>
        <select name="inputLang" id="inputLang" onChange={handleInputChange} defaultValue="en-us">
          <option value="en-us">English (US)</option>
          <option value="en-in">English (India)</option>
          <option value="hi">Hindi</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </div>
      <div className="control-group">
        <label htmlFor="outputLang">Translate To</label>
        <select name="outputLang" id="outputLang" onChange={handleInputChange} defaultValue="hi">
          <option value="en-us">English (US)</option>
          <option value="hi">Hindi</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </div>
      <div className="control-group">
        <label htmlFor="gender">Voice Gender</label>
        <select name="gender" id="gender" onChange={handleInputChange} defaultValue="female">
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      </div>
    </div>
  );
}

export function PageClientImpl(props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
}) {
  const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices | undefined>(
    undefined,
  );
  // State to hold the user's translation preferences
  const [translationSettings, setTranslationSettings] = React.useState({
    inputLang: 'en-us',
    outputLang: 'hi',
    gender: 'female',
  });

  const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails | undefined>(
    undefined,
  );

  const handleTranslationSettingsChange = (newSettings: any) => {
    setTranslationSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handlePreJoinSubmit = React.useCallback(
    async (values: LocalUserChoices) => {
      setPreJoinChoices(values);
      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
      url.searchParams.append('roomName', props.roomName);
      url.searchParams.append('participantName', values.username);

      // We stringify our settings and add them as metadata.
      const metadata = JSON.stringify(translationSettings);
      url.searchParams.append('metadata', metadata);

      if (props.region) {
        url.searchParams.append('region', props.region);
      }
      const connectionDetailsResp = await fetch(url.toString());
      const connectionDetailsData = await connectionDetailsResp.json();
      setConnectionDetails(connectionDetailsData);
    },
    [props.roomName, props.region, translationSettings],
  );

  return (
    <main data-lk-theme="default" style={{ height: '100%' }}>
      {connectionDetails === undefined || preJoinChoices === undefined ? (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <PreJoin onSubmit={handlePreJoinSubmit}>
            {/* We inject our custom controls into the PreJoin component */}
            <TranslationControls onChange={handleTranslationSettingsChange} />
          </PreJoin>
        </div>
      ) : (
        <VideoConferenceComponent
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          options={{ codec: props.codec, hq: props.hq }}
        />
      )}
    </main>
  );
}

function VideoConferenceComponent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: {
    hq: boolean;
    codec: VideoCodec;
  };
}) {
  const roomOptions = React.useMemo((): RoomOptions => {
    return {
      // video/publish settings can be configured here.
    };
  }, []);

  const room = React.useMemo(() => new Room(roomOptions), [roomOptions]);

  const router = useRouter();
  const handleOnLeave = React.useCallback(() => router.push('/'), [router]);

  React.useEffect(() => {
    const connectOptions: RoomConnectOptions = { autoSubscribe: true };

    room
      .connect(props.connectionDetails.serverUrl, props.connectionDetails.participantToken, connectOptions)
      .then(() => {
        if (props.userChoices.videoEnabled) {
          room.localParticipant.setCameraEnabled(true);
        }
        if (props.userChoices.audioEnabled) {
          room.localParticipant.setMicrophoneEnabled(true);
        }
      })
      .catch((error) => {
        console.error(`Error connecting to room: ${error instanceof Error ? error.message : String(error)}`);
        alert('Error connecting to the room. Please check the console for details.');
      });

    room.on(RoomEvent.Disconnected, handleOnLeave);
    return () => {
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.disconnect();
    };
  }, [room, props.connectionDetails, props.userChoices, handleOnLeave]);

  return (
    <div className="lk-room-container">
      <RoomContext.Provider value={room}>
        <VideoConference />
      </RoomContext.Provider>
    </div>
  );
}

