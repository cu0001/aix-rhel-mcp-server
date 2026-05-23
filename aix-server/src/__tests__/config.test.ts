import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../config.js";
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Snapshot and restore env around each test
const savedEnv: Record<string, string | undefined> = {};
const KEYS = [
  "AIX_HOST", "AIX_PORT", "AIX_USERNAME", "AIX_PASSWORD", "AIX_PRIVATE_KEY",
  "PROXY_HOST", "PROXY_PORT", "PROXY_USERNAME", "PROXY_PASSWORD", "PROXY_PRIVATE_KEY",
];

beforeEach(() => {
  for (const k of KEYS) savedEnv[k] = process.env[k];
  // Start with a minimal valid config
  process.env["AIX_HOST"] = "aix-host";
  process.env["AIX_USERNAME"] = "admin";
  process.env["AIX_PASSWORD"] = "secret";
  for (const k of ["AIX_PORT", "AIX_PRIVATE_KEY", "PROXY_HOST", "PROXY_PORT", "PROXY_USERNAME", "PROXY_PASSWORD", "PROXY_PRIVATE_KEY"]) {
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("loadConfig - AIX", () => {
  it("returns correct AIX credentials with password", () => {
    const cfg = loadConfig();
    expect(cfg.aix.host).toBe("aix-host");
    expect(cfg.aix.username).toBe("admin");
    expect(cfg.aix.password).toBe("secret");
    expect(cfg.aix.port).toBe(22);
  });

  it("uses custom AIX port", () => {
    process.env["AIX_PORT"] = "2222";
    const cfg = loadConfig();
    expect(cfg.aix.port).toBe(2222);
  });

  it("prefers privateKey over password", () => {
    process.env["AIX_PRIVATE_KEY"] = "-----BEGIN RSA KEY-----";
    const cfg = loadConfig();
    expect(cfg.aix.privateKey).toBe("-----BEGIN RSA KEY-----");
    expect(cfg.aix.password).toBeUndefined();
  });

  it("throws when AIX_HOST is missing", () => {
    delete process.env["AIX_HOST"];
    expect(() => loadConfig()).toThrow("AIX_HOST");
  });

  it("throws when AIX_USERNAME is missing", () => {
    delete process.env["AIX_USERNAME"];
    expect(() => loadConfig()).toThrow("AIX_USERNAME");
  });

  it("throws when neither AIX_PASSWORD nor AIX_PRIVATE_KEY is set", () => {
    delete process.env["AIX_PASSWORD"];
    expect(() => loadConfig()).toThrow(/AIX_PASSWORD|AIX_PRIVATE_KEY/);
  });

  it("expands tilde in AIX_PRIVATE_KEY path", () => {
    const testDir = join(tmpdir(), "aix-test-" + Date.now());
    const testKeyPath = join(testDir, "test_key");
    const testKeyContent = "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----";
    
    try {
      // Create test directory and key file
      mkdirSync(testDir, { recursive: true });
      writeFileSync(testKeyPath, testKeyContent, "utf8");
      
      // Mock HOME environment variable
      const originalHome = process.env.HOME;
      process.env.HOME = testDir;
      
      // Set private key path with tilde
      delete process.env["AIX_PASSWORD"];
      process.env["AIX_PRIVATE_KEY"] = "~/test_key";
      
      const cfg = loadConfig();
      expect(cfg.aix.privateKey).toBe(testKeyContent);
      expect(cfg.aix.password).toBeUndefined();
      
      // Restore HOME
      process.env.HOME = originalHome;
    } finally {
      // Cleanup
      if (existsSync(testKeyPath)) unlinkSync(testKeyPath);
      if (existsSync(testDir)) {
        try {
          rmdirSync(testDir);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  });

  it("throws error when tilde expansion fails due to missing HOME", () => {
    const originalHome = process.env.HOME;
    const originalUserProfile = process.env.USERPROFILE;
    
    try {
      delete process.env.HOME;
      delete process.env.USERPROFILE;
      delete process.env["AIX_PASSWORD"];
      process.env["AIX_PRIVATE_KEY"] = "~/test_key";
      
      expect(() => loadConfig()).toThrow("Unable to determine home directory");
    } finally {
      if (originalHome) process.env.HOME = originalHome;
      if (originalUserProfile) process.env.USERPROFILE = originalUserProfile;
    }
  });
});

describe("loadConfig - proxy", () => {
  it("returns no proxy when PROXY_HOST is not set", () => {
    const cfg = loadConfig();
    expect(cfg.proxy).toBeUndefined();
  });

  it("returns proxy config when PROXY_* vars are set", () => {
    process.env["PROXY_HOST"] = "bastion";
    process.env["PROXY_USERNAME"] = "jump-user";
    process.env["PROXY_PASSWORD"] = "jump-pass";
    const cfg = loadConfig();
    expect(cfg.proxy?.host).toBe("bastion");
    expect(cfg.proxy?.username).toBe("jump-user");
    expect(cfg.proxy?.password).toBe("jump-pass");
  });

  it("uses default proxy port 22", () => {
    process.env["PROXY_HOST"] = "bastion";
    process.env["PROXY_USERNAME"] = "jump-user";
    process.env["PROXY_PASSWORD"] = "jump-pass";
    const cfg = loadConfig();
    expect(cfg.proxy?.port).toBe(22);
  });

  it("throws when proxy is set but no proxy auth", () => {
    process.env["PROXY_HOST"] = "bastion";
    process.env["PROXY_USERNAME"] = "jump-user";
    expect(() => loadConfig()).toThrow(/PROXY_PASSWORD|PROXY_PRIVATE_KEY/);
  });

  it("expands tilde in PROXY_PRIVATE_KEY path", () => {
    const testDir = join(tmpdir(), "proxy-test-" + Date.now());
    const testKeyPath = join(testDir, "proxy_key");
    const testKeyContent = "-----BEGIN RSA PRIVATE KEY-----\nproxy\n-----END RSA PRIVATE KEY-----";
    
    try {
      // Create test directory and key file
      mkdirSync(testDir, { recursive: true });
      writeFileSync(testKeyPath, testKeyContent, "utf8");
      
      // Mock HOME environment variable
      const originalHome = process.env.HOME;
      process.env.HOME = testDir;
      
      // Set proxy with tilde path
      process.env["PROXY_HOST"] = "bastion";
      process.env["PROXY_USERNAME"] = "jump-user";
      process.env["PROXY_PRIVATE_KEY"] = "~/proxy_key";
      
      const cfg = loadConfig();
      expect(cfg.proxy?.privateKey).toBe(testKeyContent);
      expect(cfg.proxy?.password).toBeUndefined();
      
      // Restore HOME
      process.env.HOME = originalHome;
    } finally {
      // Cleanup
      if (existsSync(testKeyPath)) unlinkSync(testKeyPath);
      if (existsSync(testDir)) {
        try {
          rmdirSync(testDir);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  });
});
