import { Client } from "ssh2";
import type { ConnectConfig } from "ssh2";
import type { Readable } from "stream";
import type { SSHCredentials, AppConfig } from "../config.js";
import { SSHError, CommandError } from "../errors.js";
import { logger } from "../logger.js";

const SSH_TIMEOUT = 30000;

interface ActiveConnection {
  client: Client;
  proxyClient?: Client;
}

function buildConnectConfig(creds: SSHCredentials, sock?: Readable): ConnectConfig {
  const cfg: ConnectConfig = {
    username: creds.username,
    readyTimeout: SSH_TIMEOUT,
  };
  if (sock) {
    cfg.sock = sock;
  } else {
    cfg.host = creds.host;
    cfg.port = creds.port;
  }
  if (creds.privateKey) cfg.privateKey = creds.privateKey;
  else if (creds.password) cfg.password = creds.password;
  return cfg;
}

export class SSHConnectionManager {
  private active: ActiveConnection | null = null;
  // Deduplicates concurrent connect attempts so we only open one connection
  private connecting: Promise<ActiveConnection> | null = null;

  constructor(private readonly appConfig: AppConfig) {}

  async execute(command: string): Promise<string> {
    logger.debug("Executing command", { command });
    let client = await this.ensureConnection();
    try {
      return await this.runExec(client, command);
    } catch (err) {
      if (err instanceof CommandError) throw err;
      // Connection may be stale — reset once and retry
      logger.warn("Connection error, reconnecting", { error: String(err) });
      this.resetConnection();
      client = await this.ensureConnection();
      return this.runExec(client, command);
    }
  }

  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    logger.debug("Downloading file", { remotePath, localPath });
    const client = await this.ensureConnection();
    return new Promise((resolve, reject) => {
      client.sftp((err, sftp) => {
        if (err) { reject(new SSHError("SFTP init failed", err)); return; }
        sftp.fastGet(remotePath, localPath, (err) => {
          if (err) reject(new SSHError(`Download failed: ${remotePath}`, err));
          else resolve();
        });
      });
    });
  }

  close(): void {
    if (this.active) {
      logger.info("Closing SSH connections");
      this.active.proxyClient?.end();
      this.active.client.end();
      this.active = null;
    }
  }

  private async ensureConnection(): Promise<Client> {
    if (this.active) return this.active.client;
    if (this.connecting) return (await this.connecting).client;

    this.connecting = (
      this.appConfig.proxy ? this.createProxyConnection() : this.createDirectConnection()
    )
      .then((active) => {
        this.active = active;
        this.connecting = null;

        const cleanup = () => {
          logger.warn("SSH connection closed unexpectedly");
          this.active = null;
        };
        active.client.on("close", cleanup);
        active.client.on("error", (err) => {
          logger.error("SSH client error", { error: err.message });
          this.active = null;
        });
        if (active.proxyClient) {
          active.proxyClient.on("close", cleanup);
          active.proxyClient.on("error", (err) => {
            logger.error("Proxy client error", { error: err.message });
            this.active = null;
          });
        }
        return active;
      })
      .catch((err) => {
        this.connecting = null;
        throw new SSHError("Failed to establish SSH connection", err instanceof Error ? err : undefined);
      });

    return (await this.connecting).client;
  }

  private resetConnection(): void {
    if (this.active) {
      try { this.active.proxyClient?.end(); } catch { /* ignore */ }
      try { this.active.client.end(); } catch { /* ignore */ }
      this.active = null;
    }
  }

  private runExec(client: Client, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      client.exec(command, (err, stream) => {
        if (err) { reject(new SSHError("exec failed", err)); return; }

        let output = "";
        let errorOutput = "";

        stream
          .on("close", (code: number) => {
            if (code !== 0) reject(new CommandError(command, code, errorOutput));
            else resolve(output);
          })
          .on("data", (data: Buffer) => { output += data.toString(); })
          .stderr.on("data", (data: Buffer) => { errorOutput += data.toString(); });
      });
    });
  }

  private createDirectConnection(): Promise<ActiveConnection> {
    logger.info("Connecting directly to AIX", { host: this.appConfig.aix.host });
    const config = buildConnectConfig(this.appConfig.aix);
    logger.info("SSH config", {
      host: config.host,
      port: config.port,
      username: config.username,
      hasPrivateKey: !!config.privateKey,
      privateKeyLength: config.privateKey?.length,
      hasPassword: !!config.password
    });
    return new Promise((resolve, reject) => {
      const client = new Client();
      client.on("ready", () => {
        logger.info("SSH connection established", { host: this.appConfig.aix.host });
        resolve({ client });
      });
      client.on("error", (err) => {
        logger.error("SSH connection error", { error: err.message, stack: err.stack });
        reject(err);
      });
      client.connect(config);
    });
  }

  private createProxyConnection(): Promise<ActiveConnection> {
    const proxy = this.appConfig.proxy!;
    const aix = this.appConfig.aix;
    logger.info("Connecting to AIX via proxy", { proxy: proxy.host, target: aix.host });

    return new Promise((resolve, reject) => {
      const proxyClient = new Client();

      proxyClient.on("ready", () => {
        proxyClient.forwardOut("127.0.0.1", 0, aix.host, aix.port, (err, stream) => {
          if (err) { proxyClient.end(); reject(new SSHError("Port forward failed", err)); return; }

          const aixClient = new Client();
          aixClient.on("ready", () => {
            logger.info("SSH connection established via proxy", { proxy: proxy.host, target: aix.host });
            resolve({ client: aixClient, proxyClient });
          });
          aixClient.on("error", (err) => { proxyClient.end(); reject(err); });
          aixClient.connect(buildConnectConfig(aix, stream));
        });
      });
      proxyClient.on("error", reject);
      proxyClient.connect(buildConnectConfig(proxy));
    });
  }
}
