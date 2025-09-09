import * as vscode from "vscode";
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
} from "./utils/device";

type WebviewRequest = { type: "GET_ENV" } | { type: "PING" };
type AndroidEnv = {
  installed: boolean; path: string | null; version: string | null;
  devices: ReturnType<typeof getAdbDevices>; avds: string[];
};
type IosEnv = {
  installed: boolean; path: string | null; version: string | null;
  bootedSimulators: ReturnType<typeof getBootedSimulators>;
};
type WebviewResponse =
  | { type: "ENV_RESULT"; payload: { kind: "android"; adb: AndroidEnv } | { kind: "ios"; xcode: IosEnv } }
  | { type: "PONG" }
  | { type: "ERROR"; error: string };

class MobileLogsProvider implements vscode.WebviewViewProvider {
  constructor(
    private readonly viewId: string,
    private readonly label: "Android Logs" | "iOS Logs",
    private readonly ctx: vscode.ExtensionContext
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    console.log(`resolveWebviewView for ${this.viewId}`);
    const { webview } = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.ctx.extensionUri],
    };

    webview.html = this.getHtml(webview);

    webview.onDidReceiveMessage(async (msg: WebviewRequest) => {
      console.log(`[${this.viewId}] gelen mesaj`, msg);
      try {
        switch (msg.type) {
          case "PING":
            webview.postMessage(<WebviewResponse>{ type: "PONG" });
            return;

          case "GET_ENV": {
            if (this.viewId === "mobileLogs_adb") {
              const payload: AndroidEnv = {
                installed: checkAdbInstalled(),
                path: getAdbPath(),
                version: getAdbVersion(),
                devices: getAdbDevices(),
                avds: getAndroidAvds(),
              };
              webview.postMessage(<WebviewResponse>{
                type: "ENV_RESULT",
                payload: { kind: "android", adb: payload },
              });
            } else {
              const payload: IosEnv = {
                installed: checkXcodeInstalled(),
                path: getXcodePath(),
                version: getXcodeVersion(),
                bootedSimulators: getBootedSimulators(),
              };
              webview.postMessage(<WebviewResponse>{
                type: "ENV_RESULT",
                payload: { kind: "ios", xcode: payload },
              });
            }
            return;
          }
        }
      } catch (e: any) {
        webview.postMessage(<WebviewResponse>{ type: "ERROR", error: e?.message ?? String(e) });
      }
    });
  }

  private getHtml(webview: vscode.Webview) {
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https: data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      // önemli patch: script için de unsafe-inline ekledik
      `script-src ${webview.cspSource} 'unsafe-inline'`,
    ].join("; ");

    const isAndroid = this.viewId === "mobileLogs_adb";
    const subtitle = isAndroid ? "ADB / Emulator durumu" : "Xcode / iOS Sim durumu";

    return /* html */ `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${this.label}</title>
  <style>
    :root { --muted:#6b7280; --card:#fff; --border:#e5e7eb; }
    body { font:12px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; padding:10px; }
    .row { display:flex; gap:8px; align-items:center; margin-bottom:10px; }
    button { padding:6px 10px; border-radius:8px; border:1px solid var(--border); background:#f9fafb; cursor:pointer; }
    button:hover { background:#f3f4f6; }
    .muted { color:var(--muted); }
    .card { border:1px solid var(--border); background:var(--card); border-radius:10px; padding:10px; }
    table { width:100%; border-collapse:collapse; }
    th, td { text-align:left; padding:6px 6px; border-bottom:1px solid #f1f5f9; vertical-align:top; }
    th { background:#f8fafc; font-weight:600; }
    code { background:#1111; padding:2px 4px; border-radius:6px; }
    ul { margin:6px 0; padding-left:18px; }
  </style>
</head>
<body>
  <div class="row">
    <button id="btnFetch">Bilgileri Getir</button>
    <span id="status" class="muted">${subtitle}</span>
  </div>

  <div class="card">
    <div id="content" class="muted">Henüz veri yok.</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const statusEl = document.getElementById('status');
    const content = document.getElementById('content');

    console.log("webview script booted -> ${this.viewId}");

    document.getElementById('btnFetch').addEventListener('click', () => {
      statusEl.textContent = 'Komut gönderildi...';
      vscode.postMessage({ type: 'GET_ENV' });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'ERROR') {
        statusEl.textContent = 'Hata';
        content.innerHTML = '<span class="muted">' + msg.error + '</span>';
        return;
      }

      if (msg.type === 'ENV_RESULT') {
        statusEl.textContent = 'Hazır.';

        if (msg.payload.kind === 'android') {
          const adb = msg.payload.adb;
          const devicesRows = (adb.devices||[]).map(d => {
            const props = Object.entries(d.props||{}).map(([k,v]) => \`\${k}=\${v}\`).join(' ');
            return \`<tr><td><code>\${d.id}</code></td><td>\${d.status}</td><td class="muted">\${props||'-'}</td></tr>\`;
          }).join('') || '<tr><td colspan="3" class="muted">Cihaz yok</td></tr>';

          const avdList = (adb.avds||[]).map(n => \`<li><code>\${n}</code></li>\`).join('') || '<li class="muted">AVD yok</li>';

          content.innerHTML = \`
            <table>
              <tr><th>Kurulu mu?</th><td>\${adb.installed ? 'Evet' : 'Hayır'}</td></tr>
              <tr><th>Yol</th><td><code>\${adb.path ?? '-'}</code></td></tr>
              <tr><th>Versiyon</th><td><code>\${adb.version ?? '-'}</code></td></tr>
            </table>
            <h4>Cihazlar</h4>
            <table>
              <tr><th>ID</th><th>Durum</th><th>Özellikler</th></tr>
              \${devicesRows}
            </table>
            <h4>AVD'ler</h4>
            <ul>\${avdList}</ul>
          \`;
        } else {
          const xc = msg.payload.xcode;
          const simRows = (xc.bootedSimulators||[]).map(s => {
            return \`<tr><td>\${s.name}</td><td><code>\${s.udid}</code></td><td>\${s.state}</td><td class="muted">\${s.runtime ?? '-'}</td></tr>\`;
          }).join('') || '<tr><td colspan="4" class="muted">Booted sim yok</td></tr>';

          content.innerHTML = \`
            <table>
              <tr><th>Kurulu mu?</th><td>\${xc.installed ? 'Evet' : 'Hayır'}</td></tr>
              <tr><th>Yol</th><td><code>\${xc.path ?? '-'}</code></td></tr>
              <tr><th>Versiyon</th><td><code>\${xc.version ?? '-'}</code></td></tr>
            </table>
            <h4>Booted Simulators</h4>
            <table>
              <tr><th>İsim</th><th>UDID</th><th>Durum</th><th>Runtime</th></tr>
              \${simRows}
            </table>
          \`;
        }
      }
    });
  </script>
</body>
</html>`;
  }
}

export function activate(ctx: vscode.ExtensionContext) {
  console.log("loglens extension activating...");

  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "mobileLogs_adb",
      new MobileLogsProvider("mobileLogs_adb", "Android Logs", ctx)
    ),
    vscode.window.registerWebviewViewProvider(
      "mobileLogs_ios",
      new MobileLogsProvider("mobileLogs_ios", "iOS Logs", ctx)
    )
  );
}

export function deactivate() {
  console.log("loglens extension deactivated.");
}
