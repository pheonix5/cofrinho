import * as SecureStore from 'expo-secure-store';

const KEY_PIN = 'cofrinho.wipePin';

export async function hasPin(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(KEY_PIN);
  return stored != null && stored.length > 0;
}

export async function setPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_PIN, pin, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(KEY_PIN);
  if (!stored) return false;
  return constantTimeEquals(stored, pin);
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_PIN);
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
