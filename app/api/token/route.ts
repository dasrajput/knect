import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

// Prevent caching
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const roomName = req.nextUrl.searchParams.get('roomName');
  const participantName = req.nextUrl.searchParams.get('participantName');
  const metadata = req.nextUrl.searchParams.get('metadata');
  
  if (!roomName || !participantName) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  const apiKey = 'devkey';
  const apiSecret = 'pnCh9Cw13Zh4nMP_ZBZBQiFDoIaKuWHxz1B4MToCBrQ=';
  const serverUrl = 'ws://localhost:7880';

  // Create token with metadata
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    meta metadata || undefined,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  
  // Return BOTH serverUrl and participantToken (your frontend expects this format)
  return NextResponse.json(
    {
      serverUrl: serverUrl,
      participantToken: token,
    },
    {
      headers: { 'Cache-Control': 'no-store' }
    }
  );
}
