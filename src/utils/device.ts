import { exec, execSync, spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as os from 'os';

export type Platform = 'darwin' | 'win32' | 'linux';
const PLAT = process.platform as Platform;

let currentLogcat: ChildProcessWithoutNullStreams | null = null;
let currentSimulatorLog: ChildProcessWithoutNullStreams | null = null;

// ==========================================
// Log Buffering Logic
// ==========================================
class LogBuffer {
  private buffer: string[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 100;
  private readonly MAX_BUFFER_SIZE = 500;

  constructor(
    private readonly onFlush: (lines: string[]) => void,
  ) { }

  public add(line: string) {
    if (!line) return;
    this.buffer.push(line);

    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL_MS);
    }
  }

  public flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length > 0) {
      const lines = [...this.buffer];
      this.buffer = [];
      try {
        this.onFlush(lines);
      } catch (e) {
        console.error('Error flushing log buffer:', e);
      }
    }
  }

  public clear() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.buffer = [];
  }
}

let adbLogBuffer: LogBuffer | null = null;
let iosLogBuffer: LogBuffer | null = null;

export interface AdbDevice {
  id: string;
  status: 'device' | 'offline' | 'unauthorized' | string;
  props: Record<string, string>;
}

export interface SimulatorDevice {
  name: string;
  udid: string;
  state: 'Booted' | 'Shutdown' | string;
  runtime?: string;
}

function safeExec(cmd: string): string | null {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString();
  } catch {
    return null;
  }
}

/**
 * checkAdbInstalled
 * description: Checks if ADB (Android Debug Bridge) is installed and accessible.
 * returns: boolean - true if ADB is installed, false otherwise.
 */
export function checkAdbInstalled(): boolean {
  const out = safeExec(`adb version`);
  if (out) {
    return true;
  }

  const path = getAdbPath();
  if (!path) {
    return false;
  }

  const check = safeExec(`"${path}" version`);
  return !!check;
}

/**
 * Retrieves the path to the ADB (Android Debug Bridge) executable.
 * @returns The path to the ADB executable, or null if not found.
 */
export function getAdbPath(): string | null {
  const can = safeExec(`adb version`);
  if (can) {
    return 'adb';
  }

  if (PLAT === 'win32') {
    const fromWhere = safeExec(`where adb`);
    if (fromWhere) {
      const first = fromWhere.split(/\r?\n/).find(Boolean)?.trim();
      if (first) {
        return first.replace(/\s+/g, ' ');
      }
    }
    const fromPwsh = safeExec(
      `powershell -NoProfile -Command "(Get-Command adb -ErrorAction SilentlyContinue).Source"`,
    );
    const pwsh = fromPwsh?.split(/\r?\n/).find(Boolean)?.trim();
    if (pwsh) {
      return pwsh;
    }

    const guesses = [
      process.env.ANDROID_SDK_ROOT,
      process.env.ANDROID_HOME,
      'C:\\Android\\sdk',
      `${os.homedir()}\\AppData\\Local\\Android\\Sdk`,
    ]
      .filter(Boolean)
      .map((p) => `${p}\\platform-tools\\adb.exe`);

    for (const g of guesses) {
      const v = safeExec(`"${g}" version`);
      if (v) {
        return g;
      }
    }
    return null;
  } else {
    const fromWhich = safeExec(`which adb`);
    const w = fromWhich?.split('\n').find(Boolean)?.trim();
    if (w) {
      return w;
    }

    const guesses = [
      process.env.ANDROID_SDK_ROOT,
      process.env.ANDROID_HOME,
      `${os.homedir()}/Library/Android/sdk`,
      `${os.homedir()}/Android/Sdk`,
      '/usr/local/share/android-sdk',
      '/opt/android-sdk',
    ]
      .filter(Boolean)
      .map((p) => `${p}/platform-tools/adb`);

    for (const g of guesses) {
      const v = safeExec(`"${g}" version`);
      if (v) {
        return g;
      }
    }
    return null;
  }
}

/**
 * @returns The version of ADB (Android Debug Bridge) installed, or null if not found.
 */
export function getAdbVersion(): string | null {
  const bin = getAdbPath() ?? 'adb';
  const out = safeExec(`"${bin}" version`);
  if (!out) {
    return null;
  }
  const m = out.match(/Version (\d+\.\d+\.\d+)/i);
  return m ? m[1] : null;
}

/**
 * Retrieves a list of connected ADB devices.
 * @returns An array of AdbDevice objects representing connected devices.
 */
export function getAdbDevices(): AdbDevice[] {
  const bin = getAdbPath() ?? 'adb';
  const out = safeExec(`"${bin}" devices -l`);
  if (!out) {
    return [];
  }

  const lines = out.split('\n').slice(1);

  const devices: AdbDevice[] = lines
    .map((line: string) => line.trim())
    .filter((line: string) => line && !line.startsWith('*'))
    .map((line: string) => {
      const parts = line.split(/\s+/);
      const id = parts[0] ?? '';
      const status = (parts[1] ?? '') as AdbDevice['status'];
      const props: Record<string, string> = {};
      parts.slice(2).forEach((detail: string) => {
        const [key, value] = detail.split(':');
        if (key && value) {
          props[key] = value;
        }
      });
      return { id, status, props };
    });

  return devices;
}

/**
 * Retrieves a list of running processes on the specified Android device.
 * @param deviceId The ID of the target Android device.
 * @returns An array of objects containing PID and ProcessName.
 */
export function adbGetProcesses(deviceId: string): { pid: string; name: string }[] {
  const bin = getAdbPath() ?? 'adb';
  // Use 'ps -A -o PID,NAME' for Android 8+ (Oreo). Fallback might be needed for very old devices, 
  // but most modern dev devices support this. 
  // -A: Select all processes. 
  // -o: Output format.
  const cmd = `"${bin}" -s ${deviceId} shell ps -A -o PID,NAME`;

  const out = safeExec(cmd);
  if (!out) return [];

  const lines = out.split('\n');
  // First line is header: "PID NAME" (or similar)
  // Skip first line
  const processes: { pid: string; name: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by whitespace. The Name might contain spaces? 
    // Usually package names don't contain spaces. But some kernel threads might like [kworker...].
    // split via regex for safety.
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const pid = parts[0];
      // Name is the last part usually, or the second part? 
      // With -o PID,NAME it should be strictly two columns ideally, but if name has spaces...
      // Android package names don't have spaces.
      const name = parts.slice(1).join(' ');
      processes.push({ pid, name });
    }
  }

  // Sort by name for easier searching
  return processes.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * checkXcodeInstalled
 * description: Checks if Xcode is installed and accessible (macOS only).
 * returns: boolean - true if Xcode is installed, false otherwise.
 * Note: This function only works on macOS (darwin).
 * If the platform is not macOS, it returns false.
 */
export function checkXcodeInstalled(): boolean {
  if (PLAT !== 'darwin') {
    return false;
  }
  return safeExec('xcode-select -p') !== null;
}

/**
 * Retrieves the path to the Xcode installation, or null if not found or not on macOS.
 * @returns The path to the Xcode installation, or null if not found or not on macOS.
 */
export function getXcodePath(): string | null {
  if (PLAT !== 'darwin') {
    return null;
  }
  const out = safeExec('xcode-select -p');
  const p = out?.toString().trim();
  return p || null;
}

/**
 * Retrieves the version of Xcode installed, or null if not found or not on macOS.
 * @returns The version of Xcode installed, or null if not found or not on macOS.
 * Note: This function only works on macOS (darwin).
 * If the platform is not macOS, it returns null.
 */
export function getXcodeVersion(): string | null {
  if (PLAT !== 'darwin') {
    return null;
  }
  const out = safeExec('xcodebuild -version');
  if (!out) {
    return null;
  }
  const m = out.match(/Xcode (\d+\.\d+)/);
  return m ? m[1] : null;
}

/**
 * Retrieves a list of currently booted iOS simulators (macOS only).
 * @returns An array of SimulatorDevice objects representing booted simulators.
 * Note: This function only works on macOS (darwin).
 * If the platform is not macOS, it returns an empty array.
 */
export function getBootedSimulators(): SimulatorDevice[] {
  if (PLAT !== 'darwin') {
    return [];
  }
  const json = safeExec('xcrun simctl list devices booted --json');
  if (json) {
    try {
      const data = JSON.parse(json) as {
        devices?: Record<string, Array<{ name: string; udid: string; state: string }>>;
      };
      const all: SimulatorDevice[] = Object.entries(data.devices ?? {}).flatMap(([runtime, arr]) =>
        (arr ?? [])
          .filter((d) => d.state === 'Booted')
          .map<SimulatorDevice>((d) => ({
            name: d.name,
            udid: d.udid,
            state: d.state as SimulatorDevice['state'],
            runtime,
          })),
      );
      if (all.length) {
        return all;
      }
    } catch {
      console.warn('xcrun simctl list devices booted --json output parsing failed.');
    }
  }

  const text = safeExec('xcrun simctl list devices');
  if (!text) {
    return [];
  }

  const lines = text.split('\n');
  const out: SimulatorDevice[] = [];
  let currentRuntime: string | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    const rt = line.match(/^--\s*(.+?)\s*--$/);
    if (rt) {
      currentRuntime = rt[1];
      continue;
    }
    if (!line.includes('(Booted)')) {
      continue;
    }
    const m = line.match(/^\s*([^(]+?)\s+\(([0-9a-fA-F-]+)\)\s+\((Booted)\)(?:\s+\([^)]+\))*/);
    if (m) {
      out.push({
        name: m[1].trim(),
        udid: m[2].trim(),
        state: m[3].trim() as SimulatorDevice['state'],
        runtime: currentRuntime ?? undefined,
      });
    }
  }
  return out;
}

/**
 * Retrieves a list of available Android AVDs (Android Virtual Devices).
 * @returns An array of strings representing the names of available AVDs.
 * If the emulator binary cannot be found or there are no AVDs, it returns an empty array.
 * Note: This function works on all platforms (Windows, macOS, Linux).
 * It attempts to locate the emulator binary using common environment variables and default paths.
 */
export function getAndroidAvds(): string[] {
  const emulatorBin = resolveEmulatorBinary();
  const out = emulatorBin
    ? safeExec(`"${emulatorBin}" -list-avds`)
    : safeExec(`emulator -list-avds`);
  if (!out) {
    return [];
  }
  return out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @returns The path to the Android emulator binary, or null if not found.
 * It checks common environment variables and default installation paths based on the operating system.
 */
function resolveEmulatorBinary(): string | null {
  const roots = [
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    PLAT === 'win32'
      ? `${os.homedir()}\\AppData\\Local\\Android\\Sdk`
      : `${os.homedir()}/Library/Android/sdk`,
    PLAT === 'linux' ? `${os.homedir()}/Android/Sdk` : null,
  ].filter(Boolean) as string[];

  const candidates =
    PLAT === 'win32'
      ? roots.map((r) => `${r}\\emulator\\emulator.exe`)
      : roots.map((r) => `${r}/emulator/emulator`);

  for (const c of candidates) {
    const v = safeExec(`"${c}" -version`);
    if (v) {
      return c;
    }
  }
  return null;
}

/**
 * ADB Kill Server
 * description: Kills the ADB (Android Debug Bridge) server if it is running.
 * This can be useful to reset the ADB connection or resolve issues with connected devices.
 */
export async function adbKillServer(): Promise<boolean> {
  return new Promise((resolve) => {
    const bin = getAdbPath() ?? 'adb';
    exec(`"${bin}" kill-server`, (error) => {
      if (error) {
        console.error('Failed to kill ADB server:', error);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * ADB Stop
 * description: Stops the ADB (Android Debug Bridge) server if it is running.
 */
export function adbStopLogcat(webview?: any): void {
  console.log('adbStopLogcat called');

  // Clear buffer
  if (adbLogBuffer) {
    adbLogBuffer.clear();
    adbLogBuffer = null;
  }

  const p = currentLogcat;
  if (!p || p.killed) {
    // Already stopped or no process running
    console.log('No process running or already killed');
    try {
      webview?.postMessage?.({ type: 'ADB_LOGCAT_STOPPED' });
    } catch { }
    return;
  }

  console.log('Process exists, attempting to kill PID:', p.pid);
  const pid = p.pid;

  // ÖNEMLİ: Önce stream'leri temizle ki buffer'dan gelen veri UI'ye ulaşmasın!
  try {
    console.log('Cleaning up process streams and listeners');
    p.stdout?.removeAllListeners();
    p.stderr?.removeAllListeners();
    p.removeAllListeners();

    // Stream'leri pause ve destroy et
    p.stdout?.pause();
    p.stderr?.pause();
    p.stdout?.destroy();
    p.stderr?.destroy();

    console.log('Process streams cleaned up successfully');
  } catch (err) {
    console.warn('Error cleaning up streams:', err);
  }

  currentLogcat = null;

  let messageSent = false;
  const sendStoppedMessage = () => {
    if (!messageSent) {
      messageSent = true;
      console.log('Sending ADB_LOGCAT_STOPPED message');
      try {
        webview?.postMessage?.({ type: 'ADB_LOGCAT_STOPPED' });
      } catch { }
    }
  };

  // Set up a listener for when the process actually closes
  p.once('close', () => {
    console.log('Process closed naturally');
    sendStoppedMessage();
  });

  // AGRESIF DURDURMA STRATEJİSİ

  // 1. İlk SIGKILL denemesi
  try {
    console.log('Attempting immediate SIGKILL');
    p.kill('SIGKILL');
  } catch (err) {
    console.error('Failed to SIGKILL process:', err);
  }

  // 2. Process group kill (100ms sonra)
  setTimeout(() => {
    try {
      if (pid && process.platform !== 'win32') {
        console.log('Attempting process group kill');
        process.kill(-pid, 'SIGKILL');
      }
    } catch (err) {
      console.warn('Process group kill failed:', err);
    }
  }, 100);

  // 3. Sistem geneli temizlik (200ms sonra)
  setTimeout(() => {
    try {
      console.log('Attempting system-wide logcat cleanup');
      if (process.platform === 'win32') {
        execSync(`taskkill /F /IM adb.exe`, { stdio: 'ignore' });
      } else {
        // Önce pgrep ile kontrol et, sonra öldür
        try {
          const result = execSync(`pgrep -f "adb.*logcat"`, { encoding: 'utf8', stdio: 'pipe' });
          if (result.trim()) {
            const pids = result.trim().split('\n');
            console.log(`Found ${pids.length} adb logcat processes:`, pids);

            // Her PID'i tek tek öldür
            for (const pid of pids) {
              try {
                execSync(`kill -9 ${pid.trim()}`, { stdio: 'ignore' });
                console.log(`Killed PID: ${pid.trim()}`);
              } catch (killErr) {
                console.warn(`Failed to kill PID ${pid}:`, killErr);
              }
            }
          } else {
            console.log('No adb logcat processes found with pgrep');
          }
        } catch (pgrepErr) {
          // pgrep başarısız olursa pkill dene
          console.log('pgrep failed, trying pkill...');
          try {
            execSync(`pkill -9 -f "adb.*logcat"`, { stdio: 'ignore' });
            console.log('pkill completed successfully');
          } catch (pkillErr) {
            console.warn('Both pgrep and pkill failed - no logcat processes to clean up');
          }
        }
      }
    } catch (err) {
      console.warn('System-wide cleanup failed:', err);
    }
  }, 200);

  // 4. Son çare manuel PID kill (400ms sonra)
  setTimeout(() => {
    try {
      if (pid) {
        console.log('Attempting manual PID kill for:', pid);
        if (process.platform === 'win32') {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.log(`Successfully killed Windows PID: ${pid}`);
          } catch (winErr) {
            console.warn(`Windows taskkill failed for PID ${pid}:`, winErr);
          }
        } else {
          // Önce süreç var mı kontrol et
          try {
            execSync(`kill -0 ${pid}`, { stdio: 'ignore' }); // -0 sadece kontrol eder
            // Süreç varsa öldür
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            console.log(`Successfully killed Unix PID: ${pid}`);
          } catch (unixErr) {
            // Süreç zaten yok veya öldürülemedi
            console.log(`Unix PID ${pid} already dead or kill failed (this is often OK)`);
          }
        }
      }
    } catch (err) {
      console.warn('Manual PID kill failed:', err);
    }
  }, 400);

  // 5. Her durumda mesaj gönder (800ms sonra)
  setTimeout(() => {
    console.log('Timeout reached, ensuring message is sent');
    sendStoppedMessage();
  }, 800);
}

/**
 * ADB Start Logcat with options
 * UI event’leri:
 *  - { type: 'ADB_LOGCAT_STARTED', device, buffers, level }
 *  - { type: 'ADB_LOG', line }
 *  - { type: 'ADB_LOG_BATCH', lines }
 *  - { type: 'ADB_LOG_ERROR', error }
 *  - { type: 'ADB_LOGCAT_EXIT', code, signal }
 */
export function adbStartLogcat(
  webview: any,
  options: { device: string; level: string; buffer: string },
): void {
  // Ensure any existing process is fully stopped before starting new one
  if (currentLogcat && !currentLogcat.killed) {
    console.log('Stopping existing logcat process before starting new one');
    adbStopLogcat(webview);
    // Wait a bit for cleanup
    setTimeout(() => startNewLogcat(), 500);
    return;
  }

  startNewLogcat();

  function startNewLogcat() {
    const binPath = getAdbPath() ?? 'adb';
    const prio = toPriorityLetter(options.level);
    const buffers = normalizeBuffers(options.buffer);

    const args: string[] = ['-s', options.device, 'logcat'];
    for (const b of buffers) args.push('-b', b);
    args.push('-v', 'time', `*:${prio}`);

    console.log('Starting ADB logcat with args:', [binPath, ...args].join(' '));

    let child: ChildProcessWithoutNullStreams;
    try {
      // ⚠️ burada "const child = ..." demiyoruz; var olan değişkene atıyoruz
      child = spawn(binPath, args, {
        detached: false, // Don't detach from parent process
      }); // stdio belirtmeyince tipi ChildProcessWithoutNullStreams olur
    } catch (err) {
      console.error('Failed to spawn adb logcat:', err);
      try {
        webview.postMessage({
          type: 'ADB_LOG_ERROR',
          error: String((err as Error)?.message ?? err),
        });
      } catch {
        console.error('Failed to send ADB_LOG_ERROR message:', err);
      }
      return;
    }

    currentLogcat = child;
    adbLogBuffer = new LogBuffer((lines) => {
      try {
        webview.postMessage({ type: 'ADB_LOG_BATCH', lines });
      } catch {
        console.error('Failed to send ADB_LOG_BATCH message');
      }
    });

    // UI’a started
    try {
      webview.postMessage({
        type: 'ADB_LOGCAT_STARTED',
        device: options.device,
        buffers,
        level: prio,
      });
    } catch {
      console.error('Failed to send ADB_LOGCAT_STARTED message');
    }

    let lineBuf = '';
    // stdout -> line by line
    child.stdout.on('data', (chunk: Buffer) => {
      lineBuf += chunk.toString('utf8');
      const lines = lineBuf.split(/\r?\n/);
      lineBuf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line) continue;
        adbLogBuffer?.add(line);
      }
    });

    // stderr -> error
    child.stderr.on('data', (chunk: Buffer) => {
      const msg = chunk.toString('utf8');
      try {
        webview.postMessage({ type: 'ADB_LOG_ERROR', error: msg });
      } catch {
        console.error('Failed to send ADB_LOG_ERROR message:', msg);
      }
    });

    child.on('error', (err) => {
      try {
        webview.postMessage({
          type: 'ADB_LOG_ERROR',
          error: String((err as Error)?.message ?? err),
        });
      } catch {
        console.error('Failed to send ADB_LOG_ERROR message:', err);
      }
    });

    child.on('close', (code, signal) => {
      adbLogBuffer?.flush();
      try {
        webview.postMessage({ type: 'ADB_LOGCAT_EXIT', code, signal });
      } catch {
        console.error('Failed to send ADB_LOGCAT_EXIT message:', code, signal);
      }
      if (currentLogcat === child) {
        currentLogcat = null;
        lineBuf = '';
      }
    });
  } // startNewLogcat fonksiyonunun kapanışı
}

function toPriorityLetter(level: string): 'V' | 'D' | 'I' | 'W' | 'E' | 'F' | 'S' {
  const l = (level || '').trim().toLowerCase();
  if (l.startsWith('v')) return 'V';
  if (l.startsWith('d')) return 'D';
  if (l.startsWith('i')) return 'I';
  if (l.startsWith('w')) return 'W';
  if (l.startsWith('e')) return 'E';
  if (l.startsWith('f') || l.startsWith('a')) return 'F';
  if (l.startsWith('s')) return 'S';
  return 'V';
}

function normalizeBuffers(buffer: string): string[] {
  const allowed = new Set(['main', 'system', 'events', 'radio', 'crash', 'all', 'default']);
  const raw = (buffer || 'main')
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!raw.length) return ['main'];
  if (raw.includes('all')) return ['all']; // -b all her şeyi kapsar
  return raw.filter((b) => allowed.has(b)).length ? raw.filter((b) => allowed.has(b)) : ['main'];
}

function killProcessHard(p: ChildProcessWithoutNullStreams) {
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/PID', String(p.pid), '/T', '/F']);
    } catch {
      console.warn('taskkill failed, trying SIGKILL');
    }
  } else {
    try {
      p.kill('SIGKILL');
    } catch {
      console.warn('SIGKILL failed');
    }
  }
}

/**
 * iOS Simulator Log Stop
 * description: Stops the iOS simulator log stream if it is running.
 */
export function simulatorStopLog(webview?: any): void {
  // Clear buffer
  if (iosLogBuffer) {
    iosLogBuffer.clear();
    iosLogBuffer = null;
  }

  const p = currentSimulatorLog;
  if (!p || p.killed) {
    // Already stopped or no process running
    try {
      webview?.postMessage?.({ type: 'IOS_LOG_STOPPED' });
    } catch { }
    return;
  }

  currentSimulatorLog = null;

  // Set up a listener for when the process actually closes
  const handleClose = () => {
    try {
      webview?.postMessage?.({ type: 'IOS_LOG_STOPPED' });
    } catch { }
  };

  // If process closes naturally, send stopped message
  p.once('close', handleClose);

  try {
    p.kill();
  } catch { }

  // Fallback: force kill after timeout and send message
  setTimeout(() => {
    if (p && !p.killed) {
      killProcessHard(p);
      // Remove the close listener since we're force killing
      p.removeListener('close', handleClose);
      try {
        webview?.postMessage?.({ type: 'IOS_LOG_STOPPED' });
      } catch { }
    }
  }, 600);
}

/**
 * iOS Simulator Log Start with options
 * UI events:
 *  - { type: 'IOS_LOG_STARTED', device, appName }
 *  - { type: 'IOS_LOG', line }
 *  - { type: 'IOS_LOG_BATCH', lines }
 *  - { type: 'IOS_LOG_ERROR', error }
 *  - { type: 'IOS_LOG_EXIT', code, signal }
 */
export function simulatorStartLog(
  webview: any,
  options: { device: string; appName?: string },
): void {
  // Stop existing stream
  simulatorStopLog(webview);

  if (PLAT !== 'darwin') {
    try {
      webview.postMessage({
        type: 'IOS_LOG_ERROR',
        error: 'iOS simulator logging is only supported on macOS',
      });
    } catch {
      // ignore
    }
    return;
  }

  const { device: udid, appName } = options;

  // Build the xcrun simctl log stream command
  const args = ['simctl', 'spawn', udid, 'log', 'stream'];

  // Add predicate filter if app name is provided
  if (appName && appName.trim()) {
    // If app name provided, create a contains predicate for more flexible matching
    // This allows partial matches like "lotteries" in "com.example.lotteries"
    const sanitizedAppName = appName.trim().replace(/"/g, '\\"'); // Escape any quotes
    args.push('--predicate', `process CONTAINS "${sanitizedAppName}"`);

    // Add syslog style for better formatting
    args.push('--style', 'syslog');
  }

  console.log('Starting iOS simulator log with args:', ['xcrun', ...args].join(' '));

  let child: ChildProcessWithoutNullStreams;
  try {
    child = spawn('xcrun', args);
  } catch (err) {
    console.error('Failed to spawn xcrun simctl log:', err);
    try {
      webview.postMessage({
        type: 'IOS_LOG_ERROR',
        error: String((err as Error)?.message ?? err),
      });
    } catch {
      console.error('Failed to send IOS_LOG_ERROR message:', err);
    }
    return;
  }

  currentSimulatorLog = child;
  iosLogBuffer = new LogBuffer((lines) => {
    try {
      webview.postMessage({ type: 'IOS_LOG_BATCH', lines });
    } catch {
      console.error('Failed to send IOS_LOG_BATCH message');
    }
  });

  // Send started message to UI
  try {
    webview.postMessage({
      type: 'IOS_LOG_STARTED',
      device: udid,
      appName: appName || 'All processes',
    });
  } catch {
    console.error('Failed to send IOS_LOG_STARTED message');
  }

  let iosLineBuf = '';

  // Handle stdout - line by line
  child.stdout.on('data', (chunk: Buffer) => {
    iosLineBuf += chunk.toString('utf8');
    const lines = iosLineBuf.split(/\r?\n/);
    iosLineBuf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line) continue;
      iosLogBuffer?.add(line);
    }
  });

  // Handle stderr - errors
  child.stderr.on('data', (chunk: Buffer) => {
    const msg = chunk.toString('utf8');
    try {
      webview.postMessage({ type: 'IOS_LOG_ERROR', error: msg });
    } catch {
      console.error('Failed to send IOS_LOG_ERROR message:', msg);
    }
  });

  child.on('error', (err) => {
    try {
      webview.postMessage({
        type: 'IOS_LOG_ERROR',
        error: String((err as Error)?.message ?? err),
      });
    } catch {
      console.error('Failed to send IOS_LOG_ERROR message:', err);
    }
  });

  child.on('close', (code, signal) => {
    try {
      webview.postMessage({ type: 'IOS_LOG_EXIT', code, signal });
    } catch {
      console.error('Failed to send IOS_LOG_EXIT message:', code, signal);
    }
    if (currentSimulatorLog === child) {
      currentSimulatorLog = null;
      iosLineBuf = '';
    }
  });
}
