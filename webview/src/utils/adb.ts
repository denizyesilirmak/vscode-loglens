const parseLogLine = (line: string) => {
  const regex =
    /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)\s+([A-Z])\/([^(]+)\(\s*(\d+)(?:\s+(\d+))?\):\s+(.*)$/;
  const match = line.match(regex);

  if (!match) return null;

  const [, time, level, tag, pid, tid, message] = match;

  return {
    Time: time.trim(),
    PID: pid,
    TID: tid || '',
    Tag: tag.trim(),
    Message: message.trim(),
  };
};

export { parseLogLine };
