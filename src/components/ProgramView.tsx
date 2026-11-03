import { useState } from 'react'
import { setProgram } from '../db/programRepo'
import { formatTarget, programMinutes, type Program, type ProgramDay } from '../engine/program'
import { Card, ScreenHeader } from './ui'
import { ConfirmButton } from './confirm'

/** The Plan tab while a fixed program is on: its numbered days, in order, with the next one marked. */
export function ProgramView({ program, next, doneCount }: { program: Program; next: number; doneCount: number }) {
  return (
    <>
      <ScreenHeader title={`${program.name} program`} subtitle={`${program.days.length} days in order, not tied to weekdays`} />
      <Card>
        <p><strong>Equipment:</strong> {program.equipment}</p>
        <ul className="plain">{program.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
        <p className="hint">{doneCount > 0 ? `${doneCount} program day${doneCount === 1 ? '' : 's'} done so far. ` : ''}Rest whenever you need to: the next day waits for you. To go back to the standard plan, choose Standard in the Workout profile menu on Home.</p>
      </Card>
      <div className="fold-list">
        {program.days.map((d, i) => <DayFold key={i} program={program} day={d} index={i} next={i === next} />)}
      </div>
    </>
  )
}

function DayFold({ program, day, index, next }: { program: Program; day: ProgramDay; index: number; next: boolean }) {
  const [open, setOpen] = useState(next)
  return (
    <section className={`fold${open ? ' open' : ''}${next ? ' next' : ''}`}>
      <button type="button" className="fold-head" aria-expanded={open} aria-controls={`pday-${index}`} onClick={() => setOpen(!open)}>
        <span className="fold-title">Day {index + 1} · {day.title}</span>
        <span className={next ? 'tag' : 'fold-meta'}>{next ? 'Next' : `${programMinutes(day)} min`}</span>
        <span className="fold-chev" aria-hidden="true" />
      </button>
      {open && (
        <div id={`pday-${index}`} className="fold-body">
          <ul className="plain prog-list">
            {day.warmup ? <li>Warm-up · {day.warmup} min</li> : null}
            {day.walk ? <li>{day.walk.label} · {day.walk.minutes} min</li> : null}
            {day.exercises.map((e, k) => <li key={k}><strong>{e.name}</strong> <span className="muted">· {formatTarget(e)}</span></li>)}
            {day.finish ? <li>{day.finish.label} · {day.finish.minutes} min</li> : null}
          </ul>
          {day.notes?.map((n, k) => <p key={k} className="hint">{n}</p>)}
          {!next && (
            <ConfirmButton variant="small" confirm={{ title: `Make Day ${index + 1} the next day?`, message: `Day ${index + 1} (${day.title}) comes next, then the days after it in order. Nothing you saved changes.` }}
              onConfirm={() => setProgram(program.id, index)}>Do this day next</ConfirmButton>
          )}
        </div>
      )}
    </section>
  )
}
