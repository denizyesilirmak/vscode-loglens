const log = (message: unknown) => {
  window.vscode.postMessage({ type: 'NATIVE_LOG', message: String(message) });
};

export { log as nativeLog };
