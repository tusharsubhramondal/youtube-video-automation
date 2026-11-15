export type CameraMotion =
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_left_to_right'
  | 'pan_right_to_left'
  | 'tilt_up'
  | 'tilt_down';

export const CAMERA_MOTION_OPTIONS = [
  { id: 'auto', label: 'Auto (Cinematic Cycle)' },
  { id: 'zoom_in', label: 'Zoom In (Ken Burns Center)' },
  { id: 'zoom_out', label: 'Zoom Out (Ken Burns Center)' },
  { id: 'pan_left_to_right', label: 'Pan Left to Right' },
  { id: 'pan_right_to_left', label: 'Pan Right to Left' },
  { id: 'tilt_up', label: 'Tilt Upward' },
  { id: 'tilt_down', label: 'Tilt Downward' },
] as const;

const CINEMATIC_CYCLE: CameraMotion[] = [
  'zoom_in',
  'pan_left_to_right',
  'zoom_out',
  'pan_right_to_left',
  'tilt_up',
];

/**
 * Parses natural language camera directives or returns the next motion in the 5-way cinematic cycle.
 */
export function resolveCameraMotion(movement?: string | null, sceneIndex: number = 0): CameraMotion {
  if (!movement || movement.trim() === '' || movement.toLowerCase().includes('auto') || movement.toLowerCase().includes('cycle')) {
    return CINEMATIC_CYCLE[Math.abs(sceneIndex) % CINEMATIC_CYCLE.length];
  }

  const m = movement.toLowerCase().trim();

  // Zoom In
  if (m.includes('zoom in') || m === 'in' || m.includes('push in') || m.includes('zoom-in') || m.includes('slow zoom in')) {
    return 'zoom_in';
  }

  // Zoom Out
  if (m.includes('zoom out') || m === 'out' || m.includes('pull back') || m.includes('zoom-out') || m.includes('slow zoom out')) {
    return 'zoom_out';
  }

  // Pan Left to Right (or Pan Right)
  if (m.includes('left to right') || m.includes('pan right') || m.includes('drift right') || m.includes('tracking right')) {
    return 'pan_left_to_right';
  }

  // Pan Right to Left (or Pan Left)
  if (m.includes('right to left') || m.includes('pan left') || m.includes('drift left') || m.includes('tracking left')) {
    return 'pan_right_to_left';
  }

  // Tilt Down
  if (m.includes('tilt down') || m.includes('pan down') || m.includes('downward') || m.includes('pedestal down') || m.includes('crane down')) {
    return 'tilt_down';
  }

  // Tilt Up
  if (m.includes('tilt up') || m.includes('pan up') || m.includes('upward') || m.includes('pedestal up') || m.includes('crane up') || m.includes('tilt')) {
    return 'tilt_up';
  }

  // Fallback to cycling across 5 dynamic motions
  return CINEMATIC_CYCLE[Math.abs(sceneIndex) % CINEMATIC_CYCLE.length];
}

export interface BuildMotionFilterParams {
  movement?: string | null;
  sceneIndex?: number;
  totalFrames: number;
  width: number;
  height: number;
  fps: number;
}

/**
 * Builds an FFmpeg zoompan filter string for 5-way camera motion.
 * Expects the input stream to be pre-scaled (e.g. scale=2W:2H) to prevent sub-pixel jitter.
 */
export function buildCameraMotionFilter(params: BuildMotionFilterParams): {
  filter: string;
  motion: CameraMotion;
} {
  const { movement, sceneIndex = 0, totalFrames, width, height, fps } = params;
  const motion = resolveCameraMotion(movement, sceneIndex);
  const frames = Math.max(1, totalFrames);
  const step = (0.25 / frames).toFixed(5);

  let filter: string;

  switch (motion) {
    case 'zoom_in':
      filter = `zoompan=z='min(zoom+${step},1.25)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`;
      break;

    case 'zoom_out':
      filter = `zoompan=z='if(lte(zoom,1.0),1.25,max(1.001,zoom-${step}))':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`;
      break;

    case 'pan_left_to_right':
      filter = `zoompan=z='1.20':d=${frames}:x='(on/${frames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`;
      break;

    case 'pan_right_to_left':
      filter = `zoompan=z='1.20':d=${frames}:x='(1-on/${frames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`;
      break;

    case 'tilt_up':
      filter = `zoompan=z='1.20':d=${frames}:x='iw/2-(iw/zoom/2)':y='(1-on/${frames})*(ih-ih/zoom)':s=${width}x${height}:fps=${fps}`;
      break;

    case 'tilt_down':
      filter = `zoompan=z='1.20':d=${frames}:x='iw/2-(iw/zoom/2)':y='(on/${frames})*(ih-ih/zoom)':s=${width}x${height}:fps=${fps}`;
      break;

    default:
      filter = `zoompan=z='min(zoom+${step},1.25)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`;
      break;
  }

  return { filter, motion };
}
