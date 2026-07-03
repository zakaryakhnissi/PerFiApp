/**
 * Thin AsyncStorage JSON layer with zod validation on read (research.md R3).
 * Corrupt or old-schema payloads read as null instead of crashing the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { z } from 'zod';

export async function readValidated<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function write(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
