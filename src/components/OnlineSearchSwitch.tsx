import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { clearFoodCache, foodOnlineEnabled, setFoodOnline } from '../db/foodRepo'
import { Button, Dialog } from './ui'
import { ConfirmButton } from './confirm'

/**
 * The on/off switch for searching packaged foods online (Open Food Facts), with an (i) in the corner for the details.
 * Turning it on asks first, because it is the one place the app sends what you type to another site.
 */
export function OnlineSearchSwitch() {
  const on = !!useLiveQuery(() => foodOnlineEnabled(), [], false)
  const [info, setInfo] = useState(false)
  const [asking, setAsking] = useState(false)
  return (
    <div className="online-switch">
      <div className="switch-row">
        <span id="off-label">Search packaged foods online</span>
        <span className="switch-end">
          <button
            type="button" role="switch" aria-checked={on} aria-labelledby="off-label" className={on ? 'switch on' : 'switch'}
            onClick={() => { if (on) void setFoodOnline(false); else setAsking(true) }}
          ><span className="switch-knob" aria-hidden="true" /><span className="sr-only">{on ? 'On' : 'Off'}</span></button>
          <button type="button" className="info-btn" aria-label="About online food search" onClick={() => setInfo(true)}>i</button>
        </span>
      </div>
      {asking && (
        <Dialog title="Turn on online food search?" onClose={() => setAsking(false)}>
          <div className="dialog-body"><p>The words you type in the food search will be sent to <strong>world.openfoodfacts.org</strong>, and nothing else. You can turn it off at any time.</p></div>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setAsking(false)}>Cancel</Button>
            <Button onClick={() => { setAsking(false); void setFoodOnline(true) }}>OK</Button>
          </div>
        </Dialog>
      )}
      {info && (
        <Dialog title="Online food search" onClose={() => setInfo(false)}>
          <div className="dialog-body">
            <p>Packaged foods come from <strong>Open Food Facts</strong>, a free, open database. Your own common foods and Indian foods are always on this phone and work without it.</p>
            <p>It is <strong>off by default</strong>. When it is on, the words you type are sent to world.openfoodfacts.org, and nothing else: no name, no email, no phone number. Results are saved on this phone so repeat searches work offline.</p>
            <p className="hint">Packaged food values are entered by the public, so check them against the label.</p>
          </div>
          <div className="dialog-actions">
            <ConfirmButton variant="ghost" confirm={{ title: 'Clear saved online results?', message: 'Foods you already logged are not affected.' }} onConfirm={() => clearFoodCache()}>Clear saved results</ConfirmButton>
            <Button onClick={() => setInfo(false)}>Close</Button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
