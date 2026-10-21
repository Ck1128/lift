import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { acceptReschedule, getPlan, rebuildPlan, skipScheduled } from '../db/repo'
import { addDays, formatDay, startOfWeek, weekdayIndex, WEEKDAY_NAMES } from '../engine/dates'
import { coverageOf, generateWeeklySchedule } from '../engine/split'
import { ALL_MUSCLES, MUSCLE_LABEL, type Profile, type ScheduledWorkout } from '../engine/types'
import { Button, Card, ConfirmDialog, ScreenHeader } from '../components/ui'

const STATUS_LABEL = { planned: 'Planned', completed: 'Completed', partial: 'Partly done', skipped: 'Skipped' } as const

export function WeeklyPlan({ profile, today, onOpenSession }: { profile: Profile; today: string; onOpenSession: (id: string) => void }) {
  const [offset, setOffset] = useState(0)
  const [open, setOpen] = useState<string | null>(today)
  const [suggest, setSuggest] = useState<{ id: string; date: string | null } | null>(null)
  const [confirmRebuild, setConfirmRebuild] = useState(false)

  const plan = useLiveQuery(() => getPlan(), [], undefined)
  const rows = useLiveQuery(() => db.scheduled.toArray(), [], [] as ScheduledWorkout[])
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])

  const monday = addDays(startOfWeek(today), offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const split = plan ? generateWeeklySchedule({ trainingDays: plan.trainingDays, goal: profile.goal, experience: profile.experienceLevel }) : null
  const coverage = plan ? coverageOf(plan.schedule) : null

  const skip = async (r: ScheduledWorkout) => {
    const { suggestion } = await skipScheduled(r.id, today)
    setSuggest({ id: r.id, date: suggestion })
  }

  return (
    <>
      <ScreenHeader title="Weekly Plan" subtitle="Which muscles you train each day" />
      <div className="row">
        <Button variant="small" onClick={() => setOffset(offset - 1)} aria-label="Previous week">‹ Prev</Button>
        <strong>{formatDay(days[0])} – {formatDay(days[6])}</strong>
        <Button variant="small" onClick={() => setOffset(offset + 1)} aria-label="Next week">Next ›</Button>
      </div>

      {days.map((date) => {
        const dayRows = rows.filter((r) => r.date === date)
        const row = dayRows.find((r) => r.status !== 'skipped') ?? dayRows[0]
        const template = plan?.schedule[weekdayIndex(date)] ?? null
        const isToday = date === today
        const session = sessions.filter((s) => s.date === date && (s.status === 'completed' || s.status === 'partial'))[0]
        const focus = row?.focus ?? template?.focus
        const muscles = row?.targetMuscles ?? template?.muscles ?? []
        const status = row ? STATUS_LABEL[row.status] : template ? 'Planned' : 'Rest day'
        const isOpen = open === date
        return (
          <Card key={date} className={isToday ? 'today' : ''}>
            <button type="button" className="day-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : date)}>
              <span><strong>{WEEKDAY_NAMES[weekdayIndex(date)]}</strong> <span className="muted">{formatDay(date).split(', ')[1]}{isToday ? ' · today' : ''}</span></span>
              <span className={status === 'Rest day' ? 'tag rest' : status === 'Skipped' ? 'tag skip' : status === 'Completed' ? 'tag done' : 'tag'}>{status}</span>
            </button>
            <p className="big">{focus ?? 'Rest'}</p>
            {muscles.length > 0 && <p className="muted">{muscles.map((m) => MUSCLE_LABEL[m]).join(' · ')}</p>}
            {isOpen && (
              <div className="day-detail">
                {row?.workout && (
                  <ul className="plain">
                    {row.workout.exercises.map((e) => <li key={e.slotId}>{e.name} · {e.sets} × {e.repMin}-{e.repMax}</li>)}
                  </ul>
                )}
                {row && !row.workout && row.status === 'planned' && <p className="hint">Exercises are chosen on the day, from your equipment, time and history.</p>}
                {session && <Button variant="ghost" onClick={() => onOpenSession(session.id)}>View saved workout</Button>}
                {row && row.status === 'planned' && date >= today && (
                  <Button variant="ghost" onClick={() => skip(row)}>Skip this day</Button>
                )}
                {row?.rescheduledFromId && <p className="hint">Moved here from a skipped day.</p>}
                {suggest && row && suggest.id === row.id && (
                  <div className="notice" role="status">
                    {suggest.date ? (
                      <>
                        <p>Skipped. A day that gives your muscles room to recover: <strong>{formatDay(suggest.date)}</strong>. Move this workout there?</p>
                        <div className="inline">
                          <Button variant="small" onClick={async () => { await acceptReschedule(row.id, suggest.date!); setSuggest(null) }}>Move it</Button>
                          <Button variant="small" onClick={() => setSuggest(null)}>No thanks</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p>Skipped. No day this week lets those muscles recover well, so it is fine to just carry on with your plan. You do not have to make it up.</p>
                        <Button variant="small" onClick={() => setSuggest(null)}>OK</Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}

      {coverage && (
        <Card title="Muscle coverage each week">
          <p className="hint">How many sessions in your weekly plan train each muscle group.</p>
          <div className="chips">
            {ALL_MUSCLES.map((m) => (
              <span key={m} className={coverage[m] > 0 ? 'chip on static' : 'chip static'}>{MUSCLE_LABEL[m]} · {coverage[m]}</span>
            ))}
          </div>
          {split?.notes.map((n, i) => <p key={i} className="hint">{n}</p>)}
          <p className="hint">Plan version {plan?.planVersion}. Change your training days in Settings.</p>
          <Button variant="ghost" onClick={() => setConfirmRebuild(true)}>Rebuild upcoming plan</Button>
        </Card>
      )}

      {confirmRebuild && (
        <ConfirmDialog
          title="Rebuild the plan?"
          message="Upcoming planned days are re-created from your current settings. Anything you have already done or skipped stays exactly as it is."
          confirmLabel="Rebuild"
          onCancel={() => setConfirmRebuild(false)}
          onConfirm={async () => { setConfirmRebuild(false); await rebuildPlan(profile) }}
        />
      )}
    </>
  )
}
