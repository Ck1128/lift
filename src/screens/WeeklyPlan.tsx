import { Card, MockBadge, ScreenHeader } from '../components/ui'
import { MOCK_WEEK } from '../data/mock'

export function WeeklyPlan() {
  return (
    <>
      <ScreenHeader title="Weekly Plan" subtitle="Your training week at a glance" />
      <MockBadge />
      {MOCK_WEEK.map((d) => (
        <Card key={d.day}>
          <div className="row">
            <strong>{d.day}</strong>
            <span className={d.status === 'rest' ? 'tag rest' : 'tag'}>
              {d.status === 'rest' ? 'Rest day' : 'Planned'}
            </span>
          </div>
          <p className="big">{d.focus}</p>
          {d.muscles.length > 0 && <p className="muted">{d.muscles.join(' · ')}</p>}
        </Card>
      ))}
    </>
  )
}
