import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  const username = req.nextUrl.searchParams.get('username');
  if (!room || !username) {
    return NextResponse.json(
      { error: 'Missing "room" or "username" query parameter' },
      { status: 400 }
    );
  }

  // These must match your local server's --dev settings
  const apiKey = 'devkey';
  const apiSecret = 'secret';

  const at = new AccessToken(apiKey, apiSecret, { identity: username });

  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return NextResponse.json({ token });
}
