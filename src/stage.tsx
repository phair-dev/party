import { useEffect, useState } from 'react'

const fullscreenSupported = () => 'requestFullscreen' in document.documentElement

const toggleFullscreen = () =>
  (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(
    console.error,
  )

// Shared by the big-screen slide pages: step state, keyboard controls and full screen.
export function useStage(count: number) {
  const [step, setStep] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const next = () => setStep((s) => Math.min(s + 1, count - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setStep((s) => Math.min(s + 1, count - 1))
      } else if (e.key === 'f' && fullscreenSupported()) {
        toggleFullscreen()
      } else if (e.key === 'ArrowLeft') {
        setStep((s) => Math.max(s - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count])

  return { step, next, back, fullscreen, last: step === count - 1 }
}

export function StageNav({ step, last, back, next }: { step: number; last: boolean; back: () => void; next: () => void }) {
  return (
    <nav className="stage-nav" onClick={(e) => e.stopPropagation()}>
      <button disabled={step === 0} onClick={back}>
        ← Back
      </button>
      <button disabled={last} onClick={next}>
        Continue →
      </button>
    </nav>
  )
}

export function FullscreenButton({ fullscreen }: { fullscreen: boolean }) {
  // Not available everywhere (e.g. iPhone Safari), so the button hides itself there.
  if (!fullscreenSupported()) return null
  return (
    <button
      className="small stage-fullscreen"
      onClick={(e) => {
        e.stopPropagation()
        toggleFullscreen()
      }}
    >
      {fullscreen ? 'Exit full screen' : 'Full screen'}
    </button>
  )
}
