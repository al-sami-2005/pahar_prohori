/** Read alerts and guidance aloud (Bangla / English) — important for people who cannot read well. */
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import type { Lang } from '../i18n';

export function speak(text: string, lang: Lang, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, {
    language: lang === 'bn' ? 'bn-BD' : 'en-US',
    rate: lang === 'bn' ? 0.9 : 0.95,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export const stopSpeaking = () => Speech.stop();

/** Toggle helper for a "Listen" button. */
export function useSpeaker() {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => { Speech.stop(); }, []);
  return {
    speaking,
    toggle: (text: string, lang: Lang) => {
      if (speaking) { Speech.stop(); setSpeaking(false); return; }
      setSpeaking(true);
      speak(text, lang, () => setSpeaking(false));
    },
  };
}
