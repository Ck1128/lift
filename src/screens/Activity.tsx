import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { burnByDay, restingKcal, workoutBurn, yogaBurn } from '../engine/activity'
import { addDays, formatDay } from '../engine/dates'
import type { Profile } from '../engine/types'
import { Card } from '../components/ui'
import { useRouter } from '../router'
import { useT } from '../i18n'

const counted = (s: string) => s === 'completed' || s === 'partial'
const dayName = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })

export function ActivityView({ profile, today }: { profile: Profile; today: string }) {
  const t = useT()
  const { navigate } = useRouter()
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const logs = useLiveQuery(() => db.setLogs.toArray(), [], [])
  const yoga = useLiveQuery(() => db.yogaSessions.toArray(), [], [])
  const rest = restingKcal(profile)
  const days = burnByDay(sessions, logs, yoga, profile, today, 7)
  const todayRow = days[days.length - 1]
  const week = days.reduce((a, d) => a + d.active, 0)
  const max = Math.max(1, ...days.map((d) => d.active))
  const recent = [
    ...sessions.filter((s) => counted(s.status) && s.date >= addDays(today, -30)).map((s) => ({ id: s.id, kind: 'workout' as const, date: s.date, title: s.title, kcal: workoutBurn(s, logs, profile) })),
    ...yoga.filter((y) => counted(y.status) && y.date >= addDays(today, -30)).map((y) => ({ id: y.id, kind: 'yoga' as const, date: y.date, title: y.styleName, kcal: yogaBurn(y, profile) })),
  ].filter((r) => r.kcal > 0).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  const missing = !profile.weightKg || !profile.heightCm || profile.age === undefined

  return (
    <div className="activity-view">
      {missing && (
        <Card>
          <p>{t('Add your height, weight and age in Settings so the estimate fits your body.')}</p>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/settings')}>{t('Open Settings')}</button>
        </Card>
      )}
      <Card className="hero">
        <p className="eyebrow">{t('Today')}</p>
        <p className="hero-title">≈ {todayRow.active} <span className="unit-kcal">kcal</span></p>
        <p className="muted">{todayRow.active === 0 ? t('No workout or yoga logged today yet.') : t('burned in your workout and yoga today')}</p>
        {rest !== null && <p className="muted">{t('At rest your body uses about')} {rest} kcal {t('a day')}. {t('With today\'s exercise, about')} {rest + todayRow.active} kcal.</p>}
      </Card>

      <Card title={t('Last 7 days')}>
        <div className="burn-bars" role="img" aria-label={`${week} kcal in the last 7 days`}>
          {days.map((d) => (
            <div key={d.date} className={`burn-col${d.date === today ? ' now' : ''}`}>
              <span className="burn-val">{d.active || ''}</span>
              <span className="burn-bar" style={{ height: `${Math.max(d.active ? 8 : 3, (d.active / max) * 100)}%` }} />
              <span className="burn-day">{dayName(d.date)}</span>
            </div>
          ))}
        </div>
        <p className="muted">{t('Total')} ≈ {week} kcal · {t('average')} ≈ {Math.round(week / 7)} kcal {t('a day')}</p>
      </Card>

      <Card title={t('Recent sessions')}>
        {recent.length === 0 && <p className="muted">{t('Finish a workout or yoga session to see it here.')}</p>}
        <ul className="history">
          {recent.map((r) => (
            <li key={`${r.kind}-${r.id}`}>
              <button type="button" className="alt" onClick={() => navigate(r.kind === 'workout' ? `/session/${r.id}` : `/yoga/session/${r.id}`)}>
                <strong>{r.title}</strong>
                <span className="muted">{formatDay(r.date)} · ≈ {r.kcal} kcal</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <p className="fine-print">{t('Approximate. Worked out from your workouts, height, weight, age and sex. It is not a measurement and real burn can differ a lot.')}</p>
    </div>
  )
}
