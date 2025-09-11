import { useEffect, useState } from 'react';
import LogCat from '../../components/Logcat';
import Select from '../../components/Select';
import { useAdb } from '../../store/adbStore';
import './style.css';
import { nativeLog } from '../../utils/log';
import ToolBar from '../../components/ToolBar';
import { useLogcat } from '../../store/logcatStore';

const AndroidScreen = () => {
  const { devices, refreshDevices } = useAdb();
  const { startLogcat, stopLogcat, logs, clearLogs } = useLogcat();

  const [options, setOptions] = useState({
    device: '',
    level: 'verbose',
    buffer: 'main',
  });
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const handleApply = () => {
    if (!options.device) {
      nativeLog('Please select a device before applying filters.');
      return;
    }
    nativeLog(`Applied filters: ${JSON.stringify(options)}`);

    startLogcat(options);
  };

  console.log('Current logs:', logs);

  return (
    <div className="android-screen">
      <div className="bar">
        <div className="left-section">
          <span>Device:</span>
          <Select
            options={devices.map((d) => ({ value: d.id, label: d.id }))}
            defaultValue={devices[0]?.id || ''}
            onChange={(value) => {
              console.log('Selected device:', value);
              setOptions((prev) => ({ ...prev, device: value }));
            }}
            placeholder="Select Device"
          />
          <button className="refresh-button" onClick={refreshDevices}>
            ⟳
          </button>
        </div>

        <div className="right-section">
          <span>Level:</span>
          <Select
            options={[
              { value: 'verbose', label: 'Verbose' },
              { value: 'debug', label: 'Debug' },
              { value: 'info', label: 'Info' },
              { value: 'warn', label: 'Warn' },
              { value: 'error', label: 'Error' },
              { value: 'assert', label: 'Assert' },
            ]}
            defaultValue="verbose"
            onChange={(value) => setOptions((prev) => ({ ...prev, level: value }))}
          />
          <span>Buffer:</span>
          <Select
            options={[
              { value: 'main', label: 'Main' },
              { value: 'system', label: 'System' },
              { value: 'crash', label: 'Crash' },
            ]}
            defaultValue="main"
            onChange={(value) => setOptions((prev) => ({ ...prev, buffer: value }))}
          />
          <span>Keyword:</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button className="refresh-button" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
      <LogCat logs={logs} keyword={keyword} />
      <ToolBar />
    </div>
  );
};

export default AndroidScreen;
