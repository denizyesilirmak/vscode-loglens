import { useState } from 'react';
import Select from '../../components/Select';
import './style.css';
import { useIos } from '../../store/iosStore';
import SimulatorLogs from '../../components/SimulatorLogs';

const IosScreen = () => {
  const [options, setOptions] = useState({
    device: '',
    level: 'verbose',
    buffer: 'main',
  });
  const [keyword, setKeyword] = useState('');

  const { devices, refreshDevices } = useIos();

  console.log('iOS devices:', devices);

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
          />
          <button className="refresh-button" onClick={refreshDevices}>
            ⟳
          </button>
        </div>

        <div className="right-section">
          <span>Keyword:</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button className="refresh-button">Apply</button>
        </div>
      </div>
      <SimulatorLogs />
    </div>
  );
};

export default IosScreen;
