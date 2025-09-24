import { IosLogEntry } from '../store/iosLogStore';

const log = (message: unknown) => {
  window.vscode.postMessage({ type: 'NATIVE_LOG', message: String(message) });
};

/**
 * Parse iOS log line from xcrun simctl log stream
 * Example format: "2024-09-24 10:30:15.123456+0300  MyApp[1234:567890] [Category] Log message here"
 */
export function parseIosLogLine(line: string): IosLogEntry | null {
  if (!line.trim()) return null;

  // Simple regex to match iOS log format
  // This is a basic implementation - you might need to adjust based on actual log format
  const match = line.match(
    /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\.\d+[+-]\d+\s+([^[]+)\[\d+:\d+\]\s*(?:\[([^\]]+)\])?\s*(.*)$/,
  );

  if (match) {
    return {
      Time: match[1],
      Process: match[2].trim(),
      Category: match[3] || undefined,
      Message: match[4] || '',
    };
  }

  // Fallback for other formats - just timestamp and message
  const simpleMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
  if (simpleMatch) {
    return {
      Time: simpleMatch[1],
      Process: 'Unknown',
      Message: line.substring(simpleMatch[0].length).trim(),
    };
  }

  // If no timestamp found, use current time
  const now = new Date();
  return {
    Time: now.toISOString().slice(0, 19).replace('T', ' '),
    Process: 'Unknown',
    Message: line,
  };
}

export { log as nativeLog };
