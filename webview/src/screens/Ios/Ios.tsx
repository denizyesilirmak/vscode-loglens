import { useEffect, useState } from 'react';
import Select from '../../components/Select';
import './style.css';
import { useIos } from '../../store/iosStore';
import { useIosLog } from '../../store/iosLogStore';
import SimulatorLogs from '../../components/SimulatorLogs';
import { nativeLog } from '../../utils/log';

const IosScreen = () => {
  const [options, setOptions] = useState({
    device: '',
    appName: '',
  });
  const [keyword, setKeyword] = useState('');

  const { devices, refreshDevices } = useIos();
  const { startIosLog, stopIosLog, logs, clearLogs, running, loading } = useIosLog();

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const handleApply = () => {
    if (!options.device) {
      nativeLog('Please select a device before applying filters.');
      return;
    }

    // Find the selected device's UDID
    const selectedDevice = devices.find((d) => d.name === options.device);
    if (!selectedDevice) {
      nativeLog('Selected device not found.');
      return;
    }

    nativeLog(`Starting iOS log for device: ${options.device} (${selectedDevice.udid})`);

    startIosLog({
      device: selectedDevice.udid,
      appName: options.appName.trim() || undefined,
    });
  };

  const handleStop = () => {
    nativeLog('Stopping iOS log stream...');
    stopIosLog();
  };

  console.log('iOS devices:', devices);
  console.log('Current iOS logs:', logs);

  return (
    <div className="ios-screen">
      <div className="bar">
        <div className="left-section">
          <span>Device:</span>
          <Select
            options={devices.map((device) => ({ value: device.name, label: device.name }))}
            defaultValue={devices[0]?.name || ''}
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
          <span>App Name:</span>
          <input
            className="search-input"
            type="text"
            placeholder="Optional app name filter"
            value={options.appName}
            onChange={(e) => setOptions((prev) => ({ ...prev, appName: e.target.value }))}
          />
          <span>Keyword:</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {!running ? (
            <button className="refresh-button" onClick={handleApply} disabled={loading}>
              {loading ? 'Starting...' : 'Apply'}
            </button>
          ) : (
            <button className="refresh-button" onClick={handleStop}>
              Stop
            </button>
          )}
          <button className="refresh-button" onClick={clearLogs} disabled={logs.length === 0}>
            Clear
          </button>
        </div>
      </div>
      <SimulatorLogs logs={logs} keyword={keyword} />
    </div>
  );
};

export default IosScreen;
