import { createRoot } from 'react-dom/client';

import App from './App';

declare global {
  interface Window {
    acquireVsCodeApi?: () => any;
    vscode?: any;
  }
}

if (!window.vscode && window.acquireVsCodeApi) {
  window.vscode = window.acquireVsCodeApi();
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
