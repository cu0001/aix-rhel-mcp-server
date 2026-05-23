import { readFileSync, existsSync } from 'fs';

export interface SSHCredentials {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export interface AppConfig {
  rhel: SSHCredentials;
  proxy?: SSHCredentials;
}

/**
 * Expand tilde (~) in file paths to the user's home directory
 * @param filepath - The file path that may contain a tilde
 * @returns The expanded file path
 */
function expandTilde(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (!home) {
      throw new Error('Unable to determine home directory for tilde expansion');
    }
    return filepath.replace(/^~/, home);
  }
  return filepath;
}

function buildCredentials(
  host: string,
  port: number,
  username: string,
  password: string | undefined,
  privateKey: string | undefined
): SSHCredentials {
  const creds: SSHCredentials = { host, port, username };
  if (privateKey) creds.privateKey = privateKey;
  else if (password) creds.password = password;
  return creds;
}

export function loadConfig(): AppConfig {
  const host = process.env.RHEL_HOST;
  const username = process.env.RHEL_USERNAME;

  if (!host || !username) {
    throw new Error("RHEL_HOST and RHEL_USERNAME environment variables are required");
  }

  const password = process.env.RHEL_PASSWORD;
  const privateKeyEnv = process.env.RHEL_PRIVATE_KEY;
  
  // If RHEL_PRIVATE_KEY looks like a file path, read the file content
  let privateKey: string | undefined;
  if (privateKeyEnv) {
    const expandedPath = expandTilde(privateKeyEnv);
    console.error(`[DEBUG] RHEL_PRIVATE_KEY env: ${privateKeyEnv}`);
    console.error(`[DEBUG] Expanded path: ${expandedPath}`);
    console.error(`[DEBUG] File exists: ${existsSync(expandedPath)}`);
    if (existsSync(expandedPath)) {
      privateKey = readFileSync(expandedPath, 'utf8');
      console.error(`[DEBUG] Private key loaded, length: ${privateKey.length}`);
    } else {
      // Assume it's the key content itself
      privateKey = privateKeyEnv;
      console.error(`[DEBUG] Using privateKeyEnv as key content directly`);
    }
  }

  if (!password && !privateKey) {
    throw new Error("Either RHEL_PASSWORD or RHEL_PRIVATE_KEY must be provided");
  }

  const rhel = buildCredentials(
    host,
    parseInt(process.env.RHEL_PORT || "22"),
    username,
    password,
    privateKey
  );

  const proxyHost = process.env.PROXY_HOST;
  const proxyUsername = process.env.PROXY_USERNAME;

  if (!proxyHost || !proxyUsername) {
    return { rhel };
  }

  const proxyPassword = process.env.PROXY_PASSWORD;
  const proxyPrivateKeyEnv = process.env.PROXY_PRIVATE_KEY;
  
  // If PROXY_PRIVATE_KEY looks like a file path, read the file content
  let proxyPrivateKey: string | undefined;
  if (proxyPrivateKeyEnv) {
    const expandedPath = expandTilde(proxyPrivateKeyEnv);
    if (existsSync(expandedPath)) {
      proxyPrivateKey = readFileSync(expandedPath, 'utf8');
    } else {
      // Assume it's the key content itself
      proxyPrivateKey = proxyPrivateKeyEnv;
    }
  }

  if (!proxyPassword && !proxyPrivateKey) {
    throw new Error("Either PROXY_PASSWORD or PROXY_PRIVATE_KEY must be provided when using proxy");
  }

  const proxy = buildCredentials(
    proxyHost,
    parseInt(process.env.PROXY_PORT || "22"),
    proxyUsername,
    proxyPassword,
    proxyPrivateKey
  );

  return { rhel, proxy };
}

export const config = loadConfig();
