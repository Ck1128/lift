import { ALL_TRACKS, type Profile, type Track } from './types'

/** Which activities are on for a profile. Older profiles have no setting and keep both. */
export function tracksOf(p: Pick<Profile, 'tracks'> | null | undefined): { workout: boolean; yoga: boolean; list: Track[] } {
  const list = p?.tracks && p.tracks.length > 0 ? ALL_TRACKS.filter((t) => p.tracks!.includes(t)) : [...ALL_TRACKS]
  return { workout: list.includes('workout'), yoga: list.includes('yoga'), list }
}

export const TRACKS_ERROR = 'Choose Workout, Yoga, or both to continue.'
