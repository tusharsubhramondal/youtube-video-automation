export type CameraMotion =
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_left_to_right'
  | 'pan_right_to_left'
  | 'tilt_up'
  | 'tilt_down'
  | 'parallax_depth'
  | 'parallax_embers'
  | 'parallax_rain'
  | 'parallax_cosmic';

export const CAMERA_MOTION_OPTIONS = [
  { id: 'auto', label: 'Auto (5-Way Cinematic Cycle)' },
  { id: 'auto_parallax', label: 'Auto (2.5D Parallax Cycle)' },
  { id: 'parallax_depth', label: '2.5D Parallax (Cinematic Depth)' },
  { id: 'parallax_embers', label: '2.5D Parallax (Fire Embers)' },
  { id: 'parallax_rain', label: '2.5D Parallax (Rain Atmosphere)' },
  { id: 'parallax_cosmic', label: '2.5D Parallax (Cosmic Dust)' },
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

const PARALLAX_CYCLE: CameraMotion[] = [
  'parallax_depth',
  'parallax_embers',
  'parallax_cosmic',
  'parallax_rain',
];

/**
 * Parses natural language camera directives or returns the next motion in the selected cycle.
 */
export function resolveCameraMotion(movement?: string | null, sceneIndex: number = 0): CameraMotion {
  if (!movement || movement.trim() === '') {
    return CINEMATIC_CYCLE[Math.abs(sceneIndex) % CINEMATIC_CYCLE.length];
  }

  const m = movement.toLowerCase().trim();

  // Explicit Parallax Cycle or Generic Parallax
  if (
    m === 'auto_parallax' ||
    m.includes('parallax cycle') ||
    m === 'parallax' ||
    m === '2.5d' ||
    m === '2.5d parallax'
  ) {
    return PARALLAX_CYCLE[Math.abs(sceneIndex) % PARALLAX_CYCLE.length];
  }

  // 2.5D Parallax - Embers / Sparks / Fire
  if (m.includes('ember') || m.includes('spark') || m.includes('fire')) {
    return 'parallax_embers';
  }

  // 2.5D Parallax - Rain / Storm
  if (m.includes('rain') || m.includes('storm') || m.includes('droplet')) {
    return 'parallax_rain';
  }

  // 2.5D Parallax - Cosmic Dust / Stars / Space
  if (
    m.includes('cosmic') ||
    m.includes('dust') ||
    m.includes('star') ||
    m.includes('space') ||
    m.includes('nebula') ||
    m.includes('magic')
  ) {
    return 'parallax_cosmic';
  }

  // 2.5D Parallax - Multiplane Depth
  if (
    m.includes('parallax_depth') ||
    m.includes('depth') ||
    m.includes('multiplane') ||
    m.includes('layer')
  ) {
    return 'parallax_depth';
  }

  if (m.includes('auto') || m.includes('cycle')) {
    return CINEMATIC_CYCLE[Math.abs(sceneIndex) % CINEMATIC_CYCLE.length];
  }

  // Zoom In
  if (
    m.includes('zoom in') ||
    m === 'in' ||
    m.includes('push in') ||
    m.includes('zoom-in') ||
    m.includes('slow zoom in')
  ) {
    return 'zoom_in';
  }

  // Zoom Out
  if (
    m.includes('zoom out') ||
    m === 'out' ||
    m.includes('pull back') ||
    m.includes('zoom-out') ||
    m.includes('slow zoom out')
  ) {
    return 'zoom_out';
  }

  // Pan Left to Right (or Pan Right)
  if (
    m.includes('left to right') ||
    m.includes('pan right') ||
    m.includes('drift right') ||
    m.includes('tracking right')
  ) {
    return 'pan_left_to_right';
  }

  // Pan Right to Left (or Pan Left)
  if (
    m.includes('right to left') ||
    m.includes('pan left') ||
    m.includes('drift left') ||
    m.includes('tracking left')
  ) {
    return 'pan_right_to_left';
  }

  // Tilt Down
  if (
    m.includes('tilt down') ||
    m.includes('pan down') ||
    m.includes('downward') ||
    m.includes('pedestal down') ||
    m.includes('crane down')
  ) {
    return 'tilt_down';
  }

  // Tilt Up
  if (
    m.includes('tilt up') ||
    m.includes('pan up') ||
    m.includes('upward') ||
    m.includes('pedestal up') ||
    m.includes('crane up') ||
    m.includes('tilt')
  ) {
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
 * Builds an FFmpeg zoompan or 2.5D Parallax filter string.
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
    // -------------------------------------------------------------
    // 2.5D DEPTH PARALLAX ENGINES
    // -------------------------------------------------------------
    case 'parallax_depth': {
      // Multiplane separation: background has soft depth-of-field blur & slow zoom;
      // Foreground focal plane has sharp focus, faster dynamic push & radial vignette.
      const bgStep = (0.08 / frames).toFixed(5);
      const fgStep = (0.18 / frames).toFixed(5);
      const fgW = Math.round((width * 0.75) / 2) * 2;
      const fgH = Math.round((height * 0.75) / 2) * 2;
      const cropW = Math.round(width * 1.5);
      const cropH = Math.round(height * 1.5);
      filter = `split=2[bg_raw][fg_raw];[bg_raw]boxblur=6:1,vignette=PI/4,zoompan=z='min(zoom+${bgStep},1.08)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}[bg];[fg_raw]crop=${cropW}:${cropH},zoompan=z='min(zoom+${fgStep},1.22)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${fgW}x${fgH}:fps=${fps},vignette=PI/4[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`;
      break;
    }

    case 'parallax_embers': {
      // Atmospheric foreground fire embers drifting across camera with soft glow
      const emberStep = (0.20 / frames).toFixed(5);
      filter = `split=2[base_raw][p_raw];[base_raw]zoompan=z='min(zoom+${emberStep},1.20)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps},vignette=PI/4.5[base];[p_raw]scale=${width}:${height},noise=alls=60:allf=t+u,lutrgb=r='if(gt(val,248),255,0)':g='if(gt(val,248),140,0)':b='if(gt(val,248),20,0)',boxblur=2:1[emb];[base][emb]blend=all_mode=screen`;
      break;
    }

    case 'parallax_rain': {
      // Atmospheric vertical rain streaks with motion blur & moody lighting
      const rainStep = (0.15 / frames).toFixed(5);
      filter = `split=2[base_raw][p_raw];[base_raw]zoompan=z='min(zoom+${rainStep},1.15)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps},vignette=PI/4[base];[p_raw]scale=${width}:${height},noise=alls=60:allf=t+u,boxblur=0:8,lutrgb=r='if(gt(val,210),180,0)':g='if(gt(val,210),210,0)':b='if(gt(val,210),255,0)'[rain];[base][rain]blend=all_mode=screen`;
      break;
    }

    case 'parallax_cosmic': {
      // Atmospheric floating cosmic stardust / celestial particles with dreamy glow
      const cosmicStep = (0.20 / frames).toFixed(5);
      filter = `split=2[base_raw][p_raw];[base_raw]zoompan=z='min(zoom+${cosmicStep},1.20)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps},vignette=PI/4.5[base];[p_raw]scale=${width}:${height},noise=alls=45:allf=t+u,lutrgb=r='if(gt(val,251),220,0)':g='if(gt(val,251),200,0)':b='if(gt(val,251),255,0)',boxblur=3:2[dust];[base][dust]blend=all_mode=screen`;
      break;
    }

    // -------------------------------------------------------------
    // CLASSIC 5-WAY CAMERA MOTIONS
    // -------------------------------------------------------------
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
