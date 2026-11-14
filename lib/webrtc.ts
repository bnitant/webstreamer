// WebRTC utility constants and helpers

export const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: STUN_SERVERS,
  bundlePolicy: 'balanced',
  iceCandidatePoolSize: 10,
}

/**
 * Screen share constraints with full audio transfer support.
 * High-fidelity stereo audio for tab, video, game, and music sharing.
 * Video balanced at 30fps / 1080p for smooth, lag-free transmission.
 */
export function getScreenShareConstraints(): DisplayMediaStreamOptions {
  return {
    video: {
      frameRate: { ideal: 30, max: 30 },
      width:     { ideal: 1920 },
      height:    { ideal: 1080 },
      cursor:    'always',
    } as MediaTrackConstraints,
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl:  false,
      channelCount:     2,
    },
  }
}

/**
 * Camera constraints — compatible with all devices.
 * sampleRate removed: not universally supported (causes getUserMedia failure on mobile/some browsers).
 */
export function getCameraConstraints(): MediaStreamConstraints {
  return {
    video: {
      width:      { ideal: 1280, max: 1920 },
      height:     { ideal: 720,  max: 1080 },
      frameRate:  { ideal: 30,   max: 30   },
      facingMode: 'user',
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl:  true,
    },
  }
}

/**
 * Set the maximum bitrate for a given RTCRtpSender.
 * Used to enforce 8 Mbps for screen share tracks.
 */
export async function setMaxBitrate(
  sender: RTCRtpSender,
  maxBitrateBps: number,
): Promise<void> {
  try {
    const params = sender.getParameters()
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}]
    }
    for (const encoding of params.encodings) {
      encoding.maxBitrate = maxBitrateBps
    }
    await sender.setParameters(params)
  } catch (err) {
    console.warn('[WebRTC] setMaxBitrate failed:', err)
  }
}

/** Screen share max bitrate: 8 Mbps */
export const SCREEN_SHARE_BITRATE = 8_000_000

/** Camera max bitrate: 2.5 Mbps */
export const CAMERA_BITRATE = 2_500_000
