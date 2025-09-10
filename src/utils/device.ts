import { execSync } from 'child_process';
import * as os from 'os';

export type Platform = 'darwin' | 'win32' | 'linux';
const PLAT = process.platform as Platform;

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
