import { format } from 'date-fns';
import './style.css';

const columns = [
  { name: 'Time', width: '6%' },
  { name: 'PID', width: '6%' },
  { name: 'Tag', width: '6%' },
  { name: 'Message', width: 'fit-content' },
];

const shortenText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

const LogCat = ({ logs, keyword }: { logs?: any[]; keyword?: string }) => {
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
                  textOverflow: 'ellipsis',
                }}
              >
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs?.map((log, index) => (
            <tr className={`level-${log.level}`} key={index}>
              <td style={{ padding: '8px' }}>{format(new Date(log.Time), 'HH:mm:ss')}</td>
              <td style={{ padding: '8px' }}>{shortenText(log.PID, 10)}</td>
              <td style={{ padding: '8px' }}>{shortenText(log.Tag, 15)}</td>
              <td style={{ padding: '8px' }}>{shortenText(log.Message, 300)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LogCat;
