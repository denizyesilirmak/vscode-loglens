import { StopIcon } from '@heroicons/react/24/solid';
import './style.css';

const ToolBarButton = ({
  onClick,
  label,
  icon,
}: {
  onClick?: () => void;
  label?: string;
  icon?: React.ReactNode;
}) => {
  return (
    <div className="toolbar-button" onClick={onClick}>
      <div className="icon-container">{icon}</div>
      <span className="label">{label}</span>
    </div>
  );
};

const ToolBar = () => {
  return (
    <div className="toolbar-container">
      <ToolBarButton
        icon={<StopIcon />}
        label="Adb Kill Server"
        onClick={() => {
          window.vscode.postMessage({ type: 'ADB_KILL_SERVER' });
        }}
      />
    </div>
  );
};

export default ToolBar;
