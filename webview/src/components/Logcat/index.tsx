import { dummyLogs } from './mock';
import './style.css';

const columns = [
  { name: 'Time', width: '15%' },
  { name: 'PID', width: '7%' },
  { name: 'TID', width: '7%' },
  { name: 'Tag', width: '20%' },
  { name: 'Message', width: '44%' },
];

const LogCat = () => {
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
          {dummyLogs.map((log, index) => (
            <tr className={`level-${log.level}`} key={index}>
              <td style={{ padding: '8px' }}>{log.time}</td>
              <td style={{ padding: '8px' }}>{log.pid}</td>
              <td style={{ padding: '8px' }}>{log.tid}</td>
              <td style={{ padding: '8px' }}>{log.tag}</td>
              <td style={{ padding: '8px' }}>{log.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LogCat;
