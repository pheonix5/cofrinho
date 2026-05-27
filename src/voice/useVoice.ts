import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechResultsEvent = { value?: string[] };
type SpeechErrorEvent = { error?: { message?: string } };

let Voice: any = null;
let loadError: string | null = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch (e: any) {
  loadError = e?.message ?? 'Módulo de voz indisponível.';
}

export const isVoiceAvailable = Voice != null;

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error' | 'unavailable';

export function useVoice(locale = 'pt-BR') {
  const [state, setState] = useState<VoiceState>(isVoiceAvailable ? 'idle' : 'unavailable');
  const [partial, setPartial] = useState<string>('');
  const [error, setError] = useState<string | null>(
    isVoiceAvailable ? null : 'Voz só funciona em development build (não roda no Expo Go).'
  );
  const finalRef = useRef<string>('');

  useEffect(() => {
    if (!isVoiceAvailable) return;
    Voice.onSpeechStart = () => {
      setState('listening');
      setPartial('');
      finalRef.current = '';
      setError(null);
    };
    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value[0]) setPartial(e.value[0]);
    };
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value[0]) {
        finalRef.current = e.value[0];
        setPartial(e.value[0]);
      }
    };
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      setError(e.error?.message ?? 'Não foi possível reconhecer.');
      setState('error');
    };
    Voice.onSpeechEnd = () => {
      setState((s) => (s === 'listening' ? 'processing' : s));
    };
    return () => {
      Voice.destroy().then(() => Voice.removeAllListeners());
    };
  }, []);

  const start = useCallback(async () => {
    if (!isVoiceAvailable) {
      setError('Voz indisponível no Expo Go. Crie um development build.');
      setState('unavailable');
      return;
    }
    try {
      setError(null);
      setPartial('');
      finalRef.current = '';
      await Voice.start(locale);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao iniciar microfone.');
      setState('error');
    }
  }, [locale]);

  const stop = useCallback(async (): Promise<string> => {
    if (!isVoiceAvailable) return '';
    try {
      await Voice.stop();
    } catch {}
    const text = finalRef.current || partial;
    setState('idle');
    return text;
  }, [partial]);

  const cancel = useCallback(async () => {
    if (!isVoiceAvailable) return;
    try {
      await Voice.cancel();
    } catch {}
    setState('idle');
    setPartial('');
    finalRef.current = '';
  }, []);

  return { state, partial, error, start, stop, cancel, loadError };
}
