#!/usr/bin/env python3
import os
import sys
import asyncio
import json
import argparse
from datetime import datetime
import websockets
from livekit import rtc
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("TranslationBot")

# Hardcoded room ID - must match the one in PageClientImpl.tsx
ROOM_ID = "knect-translation-room"
API_KEY = os.environ.get("LIVEKIT_API_KEY", "devkey")
API_SECRET = os.environ.get("LIVEKIT_API_SECRET", "secret")
WS_URL = os.environ.get("LIVEKIT_URL", "ws://localhost:7880")

# Global state
active_translations = {}
translation_models = {}

class TranslationBot:
    def __init__(self, room_name, ws_url, api_key, api_secret):
        self.room_name = room_name
        self.ws_url = ws_url
        self.api_key = api_key
        self.api_secret = api_secret
        self.room = None
        self.connected = False
        self.participant_metadata = {}
        
    async def connect(self):
        """Connect to the LiveKit room"""
        logger.info(f"Connecting to room: {self.room_name}")
        
        try:
            # Create room client with bot identity
            self.room = rtc.Room()
            
            # Connect to room
            token = rtc.AccessToken(self.api_key, self.api_secret).with_identity("translation-bot").with_name("Translation Bot").for_room(self.room_name).to_jwt()
            
            await self.room.connect(self.ws_url, token)
            self.connected = True
            logger.info(f"Connected to room: {self.room_name}")
            
            # Set up event listeners
            self.room.on("participant_connected", self.on_participant_connected)
            self.room.on("participant_disconnected", self.on_participant_disconnected)
            self.room.on("data_received", self.on_data_received)
            
            # Keep the connection alive
            while self.connected:
                await asyncio.sleep(1)
                
        except Exception as e:
            logger.error(f"Error connecting to room: {e}")
            self.connected = False
            
    async def on_participant_connected(self, participant):
        """Handle participant connected event"""
        logger.info(f"Participant connected: {participant.identity}")
        
        # Store participant metadata if available
        if participant.metadata:
            try:
                metadata = json.loads(participant.metadata)
                self.participant_metadata[participant.identity] = metadata
                logger.info(f"Participant {participant.identity} metadata: {metadata}")
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse metadata for {participant.identity}")
    
    async def on_participant_disconnected(self, participant):
        """Handle participant disconnected event"""
        logger.info(f"Participant disconnected: {participant.identity}")
        
        # Clean up any active translations for this participant
        if participant.identity in active_translations:
            await self.stop_translation(participant.identity)
            
        # Remove participant metadata
        if participant.identity in self.participant_metadata:
            del self.participant_metadata[participant.identity]
    
    async def on_data_received(self, data, participant, kind):
        """Handle data messages from participants"""
        try:
            message = json.loads(data.decode('utf-8'))
            logger.info(f"Received data from {participant.identity}: {message}")
            
            if 'action' in message:
                if message['action'] == 'start_translation':
                    settings = message.get('settings', {})
                    await self.start_translation(participant.identity, settings)
                elif message['action'] == 'stop_translation':
                    await self.stop_translation(participant.identity)
        except json.JSONDecodeError:
            logger.warning(f"Received invalid JSON from {participant.identity}")
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    async def start_translation(self, username, settings):
        """Start translation for a user"""
        if username in active_translations:
            logger.info(f"Translation already active for {username}")
            return
            
        logger.info(f"Starting translation for {username} with settings: {settings}")
        
        # Extract settings
        input_lang = settings.get('inputLang', 'en')
        output_lang = settings.get('outputLang', 'hi')
        gender = settings.get('gender', 'female')
        
        # Simulate loading translation models
        logger.info(f"Loading translation models for {input_lang} -> {output_lang}, gender: {gender}")
        await asyncio.sleep(2)  # Simulate loading time
        
        # Store active translation
        active_translations[username] = {
            'input_lang': input_lang,
            'output_lang': output_lang,
            'gender': gender,
            'started_at': datetime.now().isoformat()
        }
        
        # Start mock transcription in background
        asyncio.create_task(self.mock_transcription(username))
        
        # Send acknowledgment to the user
        await self.send_data_to_participant(username, {
            'action': 'translation_started',
            'status': 'success'
        })
    
    async def stop_translation(self, username):
        """Stop translation for a user"""
        if username not in active_translations:
            logger.info(f"No active translation for {username}")
            return
            
        logger.info(f"Stopping translation for {username}")
        
        # Remove from active translations
        if username in active_translations:
            del active_translations[username]
            
        # Send acknowledgment to the user
        await self.send_data_to_participant(username, {
            'action': 'translation_stopped',
            'status': 'success'
        })
    
    async def mock_transcription(self, username):
        """Generate mock transcription for testing"""
        if username not in active_translations:
            return
            
        settings = active_translations[username]
        input_lang = settings['input_lang']
        output_lang = settings['output_lang']
        
        # Sample phrases in different languages
        phrases = {
            'en': [
                "Hello, how are you today?",
                "The weather is nice.",
                "I'm testing the translation system.",
                "This is a demo of live translation."
            ],
            'hi': [
                "नमस्ते, आज आप कैसे हैं?",
                "मौसम अच्छा है।",
                "मैं अनुवाद प्रणाली का परीक्षण कर रहा हूं।",
                "यह लाइव अनुवाद का एक डेमो है।"
            ],
            'fr': [
                "Bonjour, comment allez-vous aujourd'hui?",
                "Le temps est agréable.",
                "Je teste le système de traduction.",
                "C'est une démonstration de traduction en direct."
            ],
            'es': [
                "Hola, ¿cómo estás hoy?",
                "El clima está agradable.",
                "Estoy probando el sistema de traducción.",
                "Esta es una demostración de traducción en vivo."
            ]
        }
        
        # Use default if language not available
        source_phrases = phrases.get(input_lang[:2], phrases['en'])
        
        # Generate mock transcriptions
        count = 0
        while username in active_translations:
            phrase = source_phrases[count % len(source_phrases)]
            logger.info(f"[TRANSCRIPTION] ({input_lang} -> {output_lang}) {phrase}")
            
            # In a real implementation, you would:
            # 1. Listen to audio from the participant
            # 2. Transcribe it using a speech-to-text model
            # 3. Translate the text to the target language
            # 4. Optionally convert to speech with the specified gender voice
            
            count += 1
            await asyncio.sleep(5)  # Generate a new transcription every 5 seconds
    
    async def send_data_to_participant(self, participant_identity, data):
        """Send data to a specific participant"""
        if not self.room:
            logger.error("Room not connected")
            return
            
        try:
            # Find the participant
            participant = next((p for p in self.room.participants.values() if p.identity == participant_identity), None)
            if not participant:
                logger.warning(f"Participant {participant_identity} not found")
                return
                
            # Send data
            encoded_data = json.dumps(data).encode('utf-8')
            await self.room.local_participant.publish_data(encoded_data, reliability="reliable", destination_identities=[participant_identity])
            logger.info(f"Sent data to {participant_identity}: {data}")
        except Exception as e:
            logger.error(f"Error sending data: {e}")
    
    async def disconnect(self):
        """Disconnect from the room"""
        if self.room and self.connected:
            logger.info("Disconnecting from room")
            await self.room.disconnect()
            self.connected = False

async def main():
    parser = argparse.ArgumentParser(description="LiveKit Translation Bot")
    parser.add_argument("--room", default=ROOM_ID, help=f"Room name (default: {ROOM_ID})")
    parser.add_argument("--url", default=WS_URL, help=f"LiveKit WebSocket URL (default: {WS_URL})")
    parser.add_argument("--api-key", default=API_KEY, help="LiveKit API Key")
    parser.add_argument("--api-secret", default=API_SECRET, help="LiveKit API Secret")
    args = parser.parse_args()
    
    logger.info("Starting Translation Bot")
    logger.info(f"Room: {args.room}")
    logger.info(f"URL: {args.url}")
    
    bot = TranslationBot(args.room, args.url, args.api_key, args.api_secret)
    
    try:
        await bot.connect()
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    finally:
        await bot.disconnect()
        logger.info("Bot stopped")

if __name__ == "__main__":
    asyncio.run(main())