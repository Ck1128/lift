/**
 * Reference videos for yoga poses.
 *
 * RULE: an entry may be added here only after a person has opened the link and confirmed that it shows that pose.
 * Never guess a video id. A pose without an entry gets a clearly labelled YouTube SEARCH link instead (not a video).
 * The list is empty on purpose until entries are verified. See docs/YOGA_MEDIA.md for how to add one.
 */
export interface YogaVideo {
  /** The 11-character YouTube video id. */
  id: string
  title: string
  channel: string
  /** ISO date a person last confirmed the link works and shows the right pose. */
  verifiedOn: string
}

/** pose id -> verified video. */
export const POSE_VIDEOS: Readonly<Record<string, YogaVideo>> = {}

const ID_RE = /^[A-Za-z0-9_-]{11}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** True only for a complete, well-formed entry. Anything else is treated as "no video". */
export function isValidVideo(v: unknown): v is YogaVideo {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.id === 'string' && ID_RE.test(o.id)
    && typeof o.title === 'string' && o.title.trim().length > 0
    && typeof o.channel === 'string' && o.channel.trim().length > 0
    && typeof o.verifiedOn === 'string' && DATE_RE.test(o.verifiedOn)
}

export function videoFor(poseId: string, map: Readonly<Record<string, unknown>> = POSE_VIDEOS): YogaVideo | null {
  const v = map[poseId]
  return isValidVideo(v) ? v : null
}

/** Privacy-friendly embed address. Nothing is requested from YouTube until the person taps play. */
export const embedUrl = (v: YogaVideo): string => `https://www.youtube-nocookie.com/embed/${v.id}?rel=0&modestbranding=1&playsinline=1`
export const watchUrl = (v: YogaVideo): string => `https://www.youtube.com/watch?v=${v.id}`

/** A search page, not a specific video. Used when no verified video exists. */
export const searchUrl = (poseName: string, sanskrit?: string): string =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${poseName}${sanskrit ? ` ${sanskrit}` : ''} yoga pose how to`)}`
