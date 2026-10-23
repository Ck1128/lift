export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null
  return (
    <div className="banner offline" role="status">
      You are offline. Everything still works, and your workouts are saved on this phone.
    </div>
  )
}

export function UpdateBanner({ onUpdate, onDismiss }: { onUpdate: () => void; onDismiss: () => void }) {
  return (
    <div className="banner update" role="status">
      <span>A new version is ready. Your saved data is not affected.</span>
      <span>
        <button type="button" onClick={onUpdate}>Reload</button>
        <button type="button" onClick={onDismiss}>Later</button>
      </span>
    </div>
  )
}
