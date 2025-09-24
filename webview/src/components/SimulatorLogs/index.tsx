import { format } from 'date-fns';
import { IosLogEntry } from '../../store/iosLogStore';
import './style.css';
import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const columns = [
  { name: 'Time', width: '15%' },
  { name: 'Process', width: '15%' },
  { name: 'Message', width: '70%' },
];

interface SimulatorLogsProps {
  logs: IosLogEntry[];
  keyword?: string;
}

const SimulatorLogs: React.FC<SimulatorLogsProps> = ({ logs, keyword = '' }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  const filteredLogs = keyword
    ? logs.filter(
        (log) =>
          log.Message.toLowerCase().includes(keyword.toLowerCase()) ||
          log.Process.toLowerCase().includes(keyword.toLowerCase()),
      )
    : logs;

  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => logEndRef.current,
    estimateSize: () => 80,
    enabled: true,
  });

  useEffect(() => {
    if (keyword && keyword.trim() !== '') {
      return;
    }

    if (
      rowVirtualizer.scrollOffset &&
      rowVirtualizer.scrollOffset >= rowVirtualizer.getTotalSize() * 0.9
    ) {
      console.log('anan');
      rowVirtualizer.scrollToOffset(rowVirtualizer.getTotalSize());
    }
  }, [filteredLogs.length, keyword, rowVirtualizer]);

  const items = rowVirtualizer.getVirtualItems();

  return (
    <div className="logcat-container" ref={logEndRef}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.name}
                style={{
                  width: col.width,
                  textAlign: 'left',
                  borderBottom: '1px solid var(--border)',
                  padding: '8px',
                }}
              >
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          style={{
            position: 'relative',
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${items[0]?.start || 0}px)`,
            }}
          >
            {items.map((virtualRow) => {
              const log = filteredLogs[virtualRow.index];
              if (!log) return null;
              return (
                <div
                  key={virtualRow.index}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                >
                  <LogListItem key={virtualRow.index} log={log} keyword={keyword} />
                </div>
              );
            })}
          </div>
        </tbody>
      </table>
    </div>
  );
};

const LogListItem: React.FC<{ log: IosLogEntry; keyword: string }> = ({ log, keyword }) => {
  return (
    <tr>
      <td style={{ padding: '8px', fontSize: '12px', color: '#888' }}>
        {format(new Date(log.Time), 'HH:mm:ss')}
      </td>
      <td style={{ padding: '8px', fontSize: '12px', fontWeight: 'bold' }}>{log.Process}</td>
      <td style={{ padding: '8px' }}>
        {log.Category && (
          <span style={{ color: '#007acc', fontSize: '11px', marginRight: '8px' }}>
            [{log.Category}]
          </span>
        )}
        {keyword && keyword.trim() ? (
          <span
            dangerouslySetInnerHTML={{
              __html: log.Message.replace(
                new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                '<mark style="background-color: yellow; color: black;">$1</mark>',
              ),
            }}
          />
        ) : (
          log.Message
        )}
      </td>
    </tr>
  );
};

export default SimulatorLogs;
