import { useEffect, useState, useMemo } from 'react';
import LogCat from '../../components/Logcat';
import Select from '../../components/Select';
import { useAdb } from '../../store/adbStore';
import './style.css';
import { nativeLog } from '../../utils/log';
import ToolBar from '../../components/ToolBar';
import { useLogcat } from '../../store/logcatStore';
import {
  ArrowPathIcon,
  BoltIcon,
  DevicePhoneMobileIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';

const AndroidScreen = () => {
  const { devices, refreshDevices, processes, refreshProcesses, clearProcesses } = useAdb(); // UPDATED: Destructure process-related from store
  const { startLogcat, stopLogcat, logs, clearLogs, running, loading } = useLogcat();

  const [options, setOptions] = useState({
    device: '',
    level: 'verbose',
    buffer: 'main',
  });
  const [selectedProcessId, setSelectedProcessId] = useState<string>(''); // NEW: Selected Process PID
  const [keyword, setKeyword] = useState('');

  // Client-side filtering levels
  const [filterLevels, setFilterLevels] = useState<Record<string, boolean>>({
    V: true,
    D: true,
    I: true,
    W: true,
    E: true,
    F: true, // Fatal/Assert
  });

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // NEW: Fetch processes when device changes or is selected
  useEffect(() => {
    if (options.device) {
      refreshProcesses(options.device);
    } else {
      clearProcesses();
    }
  }, [options.device, refreshProcesses, clearProcesses]);


  const handleApply = () => {
    if (!options.device) {
      nativeLog('Please select a device before applying filters.');
      return;
    }
    nativeLog(`Applied filters: ${JSON.stringify(options)}`);
    startLogcat(options);
  };

  const handleStop = () => {
    nativeLog('Stopping Android logcat stream...');
    stopLogcat();
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Level filter
      if (log.Level && !filterLevels[log.Level]) {
        return false;
      }
      // Keyword filter
      if (keyword && keyword.trim()) {
        const k = keyword.toLowerCase();
        const msgMatch = log.Message.toLowerCase().includes(k);
        const tagMatch = log.Tag.toLowerCase().includes(k);
        if (!msgMatch && !tagMatch) return false;
      }

      // NEW: Process PID filter
      if (selectedProcessId && log.PID !== selectedProcessId) {
        return false;
      }

      return true;
    });
  }, [logs, keyword, filterLevels, selectedProcessId]);

  const toggleLevel = (lvl: string) => {
    setFilterLevels((prev) => ({ ...prev, [lvl]: !prev[lvl] }));
  };

  return (
    <div className="android-screen">
      <div className="bar">
        <div className="left-section">
          <DevicePhoneMobileIcon className="icon" />
          <Select
            options={devices.map((d) => ({ value: d.id, label: d.id }))}
            defaultValue={devices[0]?.id || ''}
            onChange={(value) => {
              setOptions((prev) => ({ ...prev, device: value }));
            }}
            placeholder="Select Device"
          />
          <button className="icon-button" onClick={refreshDevices}>
            <ArrowPathIcon className="icon" />
          </button>

          {/* NEW: Process Dropdown */}
          <div className="process-section">
            <Select
              options={[
                { value: '', label: 'All Processes' },
                ...processes.map(p => ({ value: p.pid, label: `${p.name} (${p.pid})` }))
              ]}
              defaultValue=""
              value={selectedProcessId}
              onChange={(val) => setSelectedProcessId(val)}
              placeholder="All Processes"
            />
            <button className="icon-button" onClick={() => options.device && refreshProcesses(options.device)} disabled={!options.device} title="Refresh Processes">
              <ArrowPathIcon className="icon" />
            </button>
          </div>
        </div>

        <div className="right-section">
          <Select
            options={[
              { value: 'main', label: 'Main' },
              { value: 'system', label: 'System' },
              { value: 'crash', label: 'Crash' },
            ]}
            defaultValue="main"
            onChange={(value) => setOptions((prev) => ({ ...prev, buffer: value }))}
          />

          <div
            className="checkbox-group"
            style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: '8px' }}
          >
            {['V', 'D', 'I', 'W', 'E'].map((lvl) => (
              <label
                key={lvl}
                style={{
                  fontSize: '0.8em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={`Toggle ${lvl}`}
              >
                <input
                  type="checkbox"
                  checked={!!filterLevels[lvl]}
                  onChange={() => toggleLevel(lvl)}
                />
                {lvl}
              </label>
            ))}
          </div>

          <input
            className="search-input"
            type="text"
            placeholder="Search keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {!running ? (
            <button className="icon-button" onClick={handleApply} disabled={loading}>
              {loading ? <BoltIcon className="icon" /> : <PlayIcon className="icon" />}
            </button>
          ) : (
            <button className="icon-button" onClick={handleStop}>
              <StopIcon className="icon" />
            </button>
          )}
          <button className="icon-button" onClick={clearLogs} disabled={logs.length === 0}>
            <TrashIcon className="icon" />
          </button>
        </div>
      </div>
      <LogCat logs={filteredLogs} keyword={keyword} />
      <ToolBar />
    </div>
  );
};

export default AndroidScreen;
