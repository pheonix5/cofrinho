import { useCallback, useRef, useState } from 'react';

let SpeechModule: any = null;
let useSpeechEvent: (event: string, cb: (e: any) => void) => void = () => {};
let loadError: string | null = null;

try {
  const mod = require('expo-speech-recognition');
  SpeechModule = mod.ExpoSpeechRecognitionModule;
  useSpeechEvent = mod.useSpeechRecognitionEvent;
} catch (e: any) {
  loadError = e?.message ?? 'Módulo de voz indisponível.';
}

export const isVoiceAvailable = SpeechModule != null;

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error' | 'unavailable';

export function useVoice(locale = 'pt-BR') {
  const [state, setState] = useState<VoiceState>(isVoiceAvailable ? 'idle' : 'unavailable');
  const [partial, setPartial] = useState<string>('');
  const [error, setError] = useState<string | null>(
    isVoiceAvailable ? null : 'Voz só funciona em development build / APK (não roda no Expo Go).'
  );
  const finalRef = useRef<string>('');

  useSpeechEvent('start', () => {
    setState('listening');
    setPartial('');
    finalRef.current = '';
    setError(null);
  });

  useSpeechEvent('result', (e: any) => {
    const transcript = e?.results?.[0]?.transcript ?? '';
    if (transcript) {
      setPartial(transcript);
      if (e?.isFinal) finalRef.current = transcript;
    }
  });

  useSpeechEvent('error', (e: any) => {
    setError(e?.message ?? e?.error ?? 'Não foi possível reconhecer.');
    setState('error');
  });

  useSpeechEvent('end', () => {
    setState((s) => (s === 'listening' ? 'processing' : s));
  });

  const start = useCallback(async () => {
    if (!SpeechModule) {
      setError('Voz indisponível neste build.');
      setState('unavailable');
      return;
    }
    try {
      const result = await SpeechModule.requestPermissionsAsync();
      if (!result?.granted) {
        setError('Permissão de microfone negada.');
        setState('error');
        return;
      }
      setError(null);
      setPartial('');
      finalRef.current = '';
      SpeechModule.start({
        lang: locale,
        interimResults: true,
        continuous: false,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao iniciar microfone.');
      setState('error');
    }
  }, [locale]);

  const stop = useCallback(async (): Promise<string> => {
    if (!SpeechModule) return '';
    try {
      SpeechModule.stop();
    } catch {}
    const text = finalRef.current || partial;
    setState('idle');
    return text;
  }, [partial]);

  const cancel = useCallback(async () => {
    if (!SpeechModule) return;
    try {
      if (typeof SpeechModule.abort === 'function') {
        SpeechModule.abort();
      } else {
        SpeechModule.stop();
      }
    } catch {}
    setState('idle');
    setPartial('');
    finalRef.current = '';
  }, []);

  return { state, partial, error, start, stop, cancel, loadError };
}
