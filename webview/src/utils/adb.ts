import type { LogEntry } from '../store/logcatStore';

const parseLogLine = (line: string): Omit<LogEntry, 'ProcessName'> | null => {
  // Regex updated to capture Level (2nd group)
  // Format: 12-18 13:45:21.123  V/Tag(123): Message
  // Group 1: Time, Group 2: Level, Group 3: Tag, Group 4: PID, Group 5: TID (opt), Group 6: Message
  const regex =
    /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)\s+([A-Z])\/([^(]+)\(\s*(\d+)(?:\s+(\d+))?\):\s+(.*)$/;
  const match = line.match(regex);

  if (!match) return null;

  const [, time, level, tag, pid, tid, message] = match;

  // ADB logcat format is MM-dd HH:mm:ss.SSS
  const currentYear = new Date().getFullYear();
  const timeWithYear = `${currentYear}-${time.trim()}`;

  // Convert to ISO-like format (local time)
  const isoTime = timeWithYear.replace(/^(\d{4})-(\d{2})-(\d{2})\s+/, '$1-$2-$3T');

  return {
    Time: isoTime,
    Level: level, // Added Level
    PID: pid,
    TID: tid || '',
    Tag: tag.trim(),
    Message: message.trim(),
  };
};

export { parseLogLine };
