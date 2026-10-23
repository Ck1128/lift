import { MUSIC_SHORTCUTS, musicLink, useMusicButtons } from '../hooks/music'
import { openShortcut } from './HealthPanel'
import { useT } from '../i18n'

const ICONS = {
  previous: <><path d="M6 5v14" /><path d="M19 5 9 12l10 7Z" /></>,
  toggle: <><path d="M7 5v14M17 5v14" /></>,
  next: <><path d="M18 5v14" /><path d="m5 5 10 7-10 7Z" /></>,
}
const LABEL = { previous: 'Previous song', toggle: 'Play or pause music', next: 'Next song' } as const

/** Previous, play/pause and next for the music on the phone. Each runs a Shortcut named in Settings. */
export function MusicControls() {
  const t = useT()
  const on = useMusicButtons()
  if (!on) return null
  const go = (k: keyof typeof MUSIC_SHORTCUTS) => openShortcut(musicLink(MUSIC_SHORTCUTS[k], window.location.href))
  return (
    <div className="music-bar" role="group" aria-label={t('Music')}>
      {(['previous', 'toggle', 'next'] as const).map((k) => (
        <button key={k} type="button" className="music-btn" aria-label={t(LABEL[k])} onClick={() => go(k)}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[k]}</svg>
        </button>
      ))}
    </div>
  )
}
