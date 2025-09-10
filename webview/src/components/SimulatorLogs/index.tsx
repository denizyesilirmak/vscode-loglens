import './style.css';

const columns = [
  { name: 'Time', width: '15%' },
  { name: 'Message', width: '85%' },
];

const dummyLogs = [
  { time: '10:00:01', message: 'Simulator started' },
  { time: '10:05:23', message: 'App installed' },
  { time: '10:15:45', message: 'App launched' },
  { time: '10:20:10', message: 'Error: Unable to connect to server' },
  { time: '10:25:30', message: 'Simulator stopped' },
];

const SimulatorLogs = () => {
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
            <tr key={index}>
              <td style={{ padding: '8px' }}>{log.time}</td>
              <td style={{ padding: '8px' }}>{log.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SimulatorLogs;
