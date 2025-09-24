import type { LogEntry } from '../store/logcatStore';

const parseLogLine = (line: string): Omit<LogEntry, 'ProcessName'> | null => {
  const regex =
    /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)\s+([A-Z])\/([^(]+)\(\s*(\d+)(?:\s+(\d+))?\):\s+(.*)$/;
  const match = line.match(regex);

  if (!match) return null;

  const [, time, level, tag, pid, tid, message] = match;

  // ADB logcat formatı MM-dd HH:mm:ss.SSS - yıl yok, bu yıl olduğunu varsayıyoruz
  const currentYear = new Date().getFullYear();
  const timeWithYear = `${currentYear}-${time.trim()}`;

  // ISO formatına çevir ama Z (UTC) koyma, local time olarak parse et
  const isoTime = timeWithYear.replace(/^(\d{4})-(\d{2})-(\d{2})\s+/, '$1-$2-$3T');

  return {
    Time: isoTime,
    PID: pid,
    TID: tid || '',
    Tag: tag.trim(),
    Message: message.trim(),
  };
};

export { parseLogLine };
