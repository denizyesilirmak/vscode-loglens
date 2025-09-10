import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  checkAdbInstalled,
  getAdbPath,
  getAdbVersion,
  getAdbDevices,
  getAndroidAvds,
  checkXcodeInstalled,
  getXcodePath,
  getXcodeVersion,
  getBootedSimulators,
} from './utils/device';

export type WebviewRequest =
  | { type: 'PING' }
  | { type: 'GET_CHECK_ADB_INSTALLED' }
  | { type: 'GET_ADB_PATH' }
  | { type: 'GET_ADB_VERSION' }
  | { type: 'GET_ADB_DEVICES' }
  | { type: 'GET_ANDROID_AVDS' }
  | { type: 'GET_CHECK_XCODE_INSTALLED' }
  | { type: 'GET_XCODE_PATH' }
  | { type: 'GET_XCODE_VERSION' }
  | { type: 'GET_BOOTED_SIMULATORS' }
  | { type: 'GET_CURRENT_PANEL' };

export interface AndroidEnv {
  installed: boolean;
  path: string | null;
  version: string | null;
  devices: ReturnType<typeof getAdbDevices>;
  avds: string[];
}

export interface IosEnv {
  installed: boolean;
  path: string | null;
  version: string | null;
  bootedSimulators: ReturnType<typeof getBootedSimulators>;
}

export type WebviewResponse =
  | { type: 'PONG' }
  | { type: 'ERROR'; error: string }
  | {
      type: 'ENV_RESULT';
      payload: { kind: 'android'; adb: AndroidEnv } | { kind: 'ios'; xcode: IosEnv };
    };

const RAW_DEV_SERVER = (process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173').replace(
  /\/+$/,
  '',
);
const IS_DEV = Boolean(process.env.VITE_DEV_SERVER_URL) || process.env.NODE_ENV === 'development';

function nonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join('');
}

function readViteManifest(distFsPath: string): { file: string; css?: string[] } {
  const manifestPath = path.join(distFsPath, '.vite', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Vite manifest bulunamadı: ${manifestPath}`);
  }
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest: Record<string, { file: string; css?: string[]; isEntry?: boolean }> =
    JSON.parse(raw);

  const entry =
    manifest['src/main.tsx'] ?? Object.values(manifest).find((m) => m?.isEntry || m?.file) ?? null;

  if (!entry || !entry.file) {
    throw new Error('Vite manifest içinde geçerli bir giriş (isEntry/file) bulunamadı.');
  }
  return entry;
}

class MobileLogsProvider implements vscode.WebviewViewProvider {
  constructor(
    private readonly viewId: 'mobileLogs_adb' | 'mobileLogs_ios',
    private readonly label: 'Android Logs' | 'iOS Logs',
    private readonly ctx: vscode.ExtensionContext,
  ) {}

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    const { webview } = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this.ctx.extensionUri,
        vscode.Uri.joinPath(this.ctx.extensionUri, 'webview', 'dist'),
      ],
    };

    let devOrigin: string | undefined;
    if (IS_DEV) {
      console.log('Tünelleniyor:', RAW_DEV_SERVER);
      const tunneled = await vscode.env.asExternalUri(vscode.Uri.parse(RAW_DEV_SERVER));
      devOrigin = tunneled.toString().replace(/\/+$/, '');
    }

    webview.html = this.getHtml(webview, devOrigin);

    webview.onDidReceiveMessage(async (msg: WebviewRequest) => {
      try {
        switch (msg.type) {
          case 'PING': {
            const res: WebviewResponse = { type: 'PONG' };
            webview.postMessage(res);
            break;
          }
          case 'GET_CHECK_ADB_INSTALLED': {
            const status = checkAdbInstalled();
            webview.postMessage({
              status: status,
            });
            break;
          }
          case 'GET_ADB_PATH': {
            const adbPath = getAdbPath();
            webview.postMessage({
              adbPath: adbPath,
            });
            break;
          }
          case 'GET_ADB_VERSION': {
            const adbVersion = getAdbVersion();
            webview.postMessage({
              adbVersion: adbVersion,
            });
            break;
          }
          case 'GET_ADB_DEVICES': {
            const devices = getAdbDevices();
            webview.postMessage({
              devices: devices,
            });
            break;
          }
          case 'GET_ANDROID_AVDS': {
            const avds = getAndroidAvds();
            webview.postMessage({
              avds: avds,
            });
            break;
          }
          case 'GET_CHECK_XCODE_INSTALLED': {
            const status = checkXcodeInstalled();
            webview.postMessage({
              status: status,
            });
            break;
          }
          case 'GET_XCODE_PATH': {
            const xcodePath = getXcodePath();
            webview.postMessage({
              xcodePath: xcodePath,
            });
            break;
          }
          case 'GET_XCODE_VERSION': {
            const xcodeVersion = getXcodeVersion();
            webview.postMessage({
              xcodeVersion: xcodeVersion,
            });
            break;
          }
          case 'GET_BOOTED_SIMULATORS': {
            const bootedSimulators = getBootedSimulators();
            webview.postMessage({
              bootedSimulators: bootedSimulators,
            });
            break;
          }
          case 'GET_CURRENT_PANEL': {
            const panel = this.viewId === 'mobileLogs_adb' ? 'android' : 'ios';
            webview.postMessage({
              panel: panel,
            });
            break;
          }
        }
      } catch (e) {
        const err: WebviewResponse = {
          type: 'ERROR',
          error: e instanceof Error ? e.message : String(e),
        };
        webview.postMessage(err);
      }
    });
  }

  private getHtml(webview: vscode.Webview, devBase?: string): string {
    const n = nonce();

    if (IS_DEV && devBase) {
      const base = devBase.replace(/\/+$/, '');
      const csp = [
        "default-src 'none'",
        `img-src ${webview.cspSource} https: data:`,
        `font-src ${webview.cspSource} https: data:`,
        `style-src ${webview.cspSource} 'unsafe-inline' ${base}`,
        `style-src-elem ${webview.cspSource} 'unsafe-inline' ${base}`,
        `script-src ${webview.cspSource} ${base} 'nonce-${n}'`,
        `script-src-elem ${webview.cspSource} ${base} 'nonce-${n}'`,
        `connect-src ${webview.cspSource} ${base} ws: wss:`,
      ].join('; ');

      return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${this.label}</title>
</head>
<body>
  <div id="root"></div>

  <script nonce="${n}">
    window.acquireVsCodeApi = acquireVsCodeApi;
    window.__LOGS_VIEW_ID__ = "${this.viewId}";
    window.__LOGS_LABEL__ = "${this.label}";
  </script>

  <script type="module" nonce="${n}">
    import RefreshRuntime from "${base}/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  </script>

  <script type="module" nonce="${n}" src="${base}/@vite/client"></script>
  <script type="module" nonce="${n}" src="${base}/src/main.tsx"></script>
</body>
</html>`;
    }

    const distUri = vscode.Uri.joinPath(this.ctx.extensionUri, 'webview', 'dist');
    const distFsPath = distUri.fsPath;
    const entry = readViteManifest(distFsPath);

    const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, entry.file));
    const cssUris: vscode.Uri[] = (entry.css ?? []).map((rel) =>
      webview.asWebviewUri(vscode.Uri.joinPath(distUri, rel)),
    );

    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https: data:`,
      `font-src ${webview.cspSource} https: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `style-src-elem ${webview.cspSource} 'unsafe-inline'`,
      `script-src ${webview.cspSource} 'nonce-${n}'`,
      `script-src-elem ${webview.cspSource} 'nonce-${n}'`,
      `connect-src ${webview.cspSource}`,
    ].join('; ');

    const cssLinks = cssUris.map((u) => `<link rel="stylesheet" href="${u}">`).join('\n');

    return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${this.label}</title>
  ${cssLinks}
</head>
<body>
  <div id="root"></div>

  <script nonce="${n}">
    window.acquireVsCodeApi = acquireVsCodeApi;
    window.__LOGS_VIEW_ID__ = "${this.viewId}";
    window.__LOGS_LABEL__ = "${this.label}";
  </script>

  <script type="module" nonce="${n}" src="${jsUri}"></script>
</body>
</html>`;
  }
}

export function activate(ctx: vscode.ExtensionContext): void {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = IS_DEV ? 'development' : 'production';
  }

  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'mobileLogs_adb',
      new MobileLogsProvider('mobileLogs_adb', 'Android Logs', ctx),
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
    vscode.window.registerWebviewViewProvider(
      'mobileLogs_ios',
      new MobileLogsProvider('mobileLogs_ios', 'iOS Logs', ctx),
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );
}

export function deactivate(): void {}
