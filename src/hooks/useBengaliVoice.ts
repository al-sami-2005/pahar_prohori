import { useCallback, useEffect, useState } from 'react'

/**
 * Browser speech synthesis, only when the device actually has a Bengali voice.
 * No audio asset ships with the demo, and a non-Bengali voice would mangle the
 * text — so without a `bn` voice the control is shown as unavailable.
 */
export function useBengaliVoice() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (!supported) return
    const pick = () => {
      const voices = window.speechSynthesis.getVoices()
      setVoice(voices.find((v) => v.lang.toLowerCase().startsWith('bn')) ?? null)
    }
    pick()
    window.speechSynthesis.addEventListener('voiceschanged', pick)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', pick)
      window.speechSynthesis.cancel()
    }
  }, [supported])

  const speak = useCallback(
    (text: string) => {
      if (!supported || !voice) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.voice = voice
      u.lang = voice.lang
      u.rate = 0.95
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      setSpeaking(true)
      window.speechSynthesis.speak(u)
    },
    [supported, voice],
  )

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  return { available: supported && !!voice, speaking, speak, stop }
}
