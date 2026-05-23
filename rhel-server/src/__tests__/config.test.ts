import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../config.js";
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const savedEnv: Record<string, string | undefined> = {};
const KEYS = [
  "RHEL_HOST", "RHEL_PORT", "RHEL_USERNAME", "RHEL_PASSWORD", "RHEL_PRIVATE_KEY",
  "PROXY_HOST", "PROXY_PORT", "PROXY_USERNAME", "PROXY_PASSWORD", "PROXY_PRIVATE_KEY",
];

beforeEach(() => {
  for (const k of KEYS) savedEnv[k] = process.env[k];
  process.env["RHEL_HOST"] = "rhel-host";
  process.env["RHEL_USERNAME"] = "admin";
  process.env["RHEL_PASSWORD"] = "secret";
  for (const k of ["RHEL_PORT", "RHEL_PRIVATE_KEY", "PROXY_HOST", "PROXY_PORT", "PROXY_USERNAME", "PROXY_PASSWORD", "PROXY_PRIVATE_KEY"]) {
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("loadConfig - RHEL", () => {
  it("returns correct RHEL credentials with password", () => {
    const cfg = loadConfig();
    expect(cfg.rhel.host).toBe("rhel-host");
    expect(cfg.rhel.username).toBe("admin");
    expect(cfg.rhel.password).toBe("secret");
    expect(cfg.rhel.port).toBe(22);
  });

  it("uses custom RHEL port", () => {
    process.env["RHEL_PORT"] = "2222";
    const cfg = loadConfig();
    expect(cfg.rhel.port).toBe(2222);
  });

  it("prefers privateKey over password", () => {
    process.env["RHEL_PRIVATE_KEY"] = "-----BEGIN RSA KEY-----";
    const cfg = loadConfig();
    expect(cfg.rhel.privateKey).toBe("-----BEGIN RSA KEY-----");
    expect(cfg.rhel.password).toBeUndefined();
  });

  it("throws when RHEL_HOST is missing", () => {
    delete process.env["RHEL_HOST"];
    expect(() => loadConfig()).toThrow("RHEL_HOST");
  });

  it("throws when RHEL_USERNAME is missing", () => {
    delete process.env["RHEL_USERNAME"];
    expect(() => loadConfig()).toThrow("RHEL_USERNAME");
  });

  it("throws when neither RHEL_PASSWORD nor RHEL_PRIVATE_KEY is set", () => {
    delete process.env["RHEL_PASSWORD"];
    expect(() => loadConfig()).toThrow(/RHEL_PASSWORD|RHEL_PRIVATE_KEY/);
  });

  it("expands tilde in RHEL_PRIVATE_KEY path", () => {
    const testDir = join(tmpdir(), "rhel-test-" + Date.now());
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
      delete process.env["RHEL_PASSWORD"];
      process.env["RHEL_PRIVATE_KEY"] = "~/test_key";
      
      const cfg = loadConfig();
      expect(cfg.rhel.privateKey).toBe(testKeyContent);
      expect(cfg.rhel.password).toBeUndefined();
      
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
      delete process.env["RHEL_PASSWORD"];
      process.env["RHEL_PRIVATE_KEY"] = "~/test_key";
      
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
