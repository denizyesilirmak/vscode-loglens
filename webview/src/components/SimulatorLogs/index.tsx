import { IosLogEntry } from '../../store/iosLogStore';
import './style.css';

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
  // Filter logs by keyword if provided
  const filteredLogs = keyword
    ? logs.filter(
        (log) =>
          log.Message.toLowerCase().includes(keyword.toLowerCase()) ||
          log.Process.toLowerCase().includes(keyword.toLowerCase()),
      )
    : logs;

  return (
    <div className="logcat-container">
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
        <tbody>
          {filteredLogs.map((log, index) => (
            <tr key={index}>
              <td style={{ padding: '8px', fontSize: '12px', color: '#888' }}>{log.Time}</td>
              <td style={{ padding: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                {log.Process}
              </td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SimulatorLogs;
