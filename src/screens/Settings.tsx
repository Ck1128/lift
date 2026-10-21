import { Card, ScreenHeader } from '../components/ui'

export const APP_VERSION = '0.1.0'

export function Settings() {
  return (
    <>
      <ScreenHeader title="Settings" subtitle="Profile, equipment and backup" />
      <Card title="Coming in later phases">
        <ul className="plain">
          <li>Profile and goals</li>
          <li>Home or gym equipment</li>
          <li>Exercise exclusions</li>
          <li>Backup and restore</li>
        </ul>
      </Card>
      <Card title="Privacy">
        <p className="muted">
          This app has no server or account. Anything you enter will be stored only on your phone.
        </p>
      </Card>
      <Card title="About">
        <p className="muted">Version {APP_VERSION}</p>
      </Card>
    </>
  )
}
