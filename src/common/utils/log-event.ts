export function logEvent(event: Record<string, unknown>) {
  console.error(
    JSON.stringify({ timestamp: new Date().toISOString(), ...event }),
  );
}
