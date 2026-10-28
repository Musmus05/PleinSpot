// localStorage can be missing or throw (private mode, blocked site data): preferences are a
// convenience, so every access fails silently.

const PREFIX = 'pleinspot:';

export function readPreference<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  try {
    const raw = globalThis.localStorage?.getItem(`${PREFIX}${key}`);

    if (raw == null) {
      return null;
    }

    const value: unknown = JSON.parse(raw);

    return isValid(value) ? value : null;
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: unknown) {
  try {
    globalThis.localStorage?.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Ignore: preferences simply won't persist.
  }
}
