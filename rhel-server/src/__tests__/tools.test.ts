import { describe, it, expect, vi, beforeEach } from "vitest";
import { createToolRegistry } from "../tools/registry.js";
import { createMockSSH } from "./helpers.js";
import type { SSHConnectionManager } from "../ssh/SSHConnectionManager.js";
import type { ToolHandler } from "../tools/types.js";

function getHandler(registry: ToolHandler[], name: string): ToolHandler {
  const h = registry.find((h) => h.definition.name === name);
  if (!h) throw new Error(`Handler "${name}" not found in registry`);
  return h;
}

describe("tool registry", () => {
  it("registers all RHEL tools", () => {
    const registry = createToolRegistry(createMockSSH());
    expect(registry.map((h) => h.definition.name)).toEqual([
      "execute_rhel_command",
      "get_rhel_system_info",
      "health_check_rhel",
      "get_rhel_power_info",
      "get_rhel_services",
      "get_kernel_params",
      "get_path_commands",
      "get_system_limits",
      "list_packages",
      "list_rhel_devices",
      "check_rhel_errors",
      "collect_sosreport",
      "analyze_journal",
      "analyze_syslog",
      "check_dump_config",
      "get_rhel_performance",
      "collect_performance_data",
      "list_rhel_filesystems",
      "read_rhel_file",
      "download_sos_file",
      "get_standard_config_files",
      "get_rhel_network_info",
      "list_rhel_processes",
      "get_rhel_users",
      "get_users_and_groups",
    ]);
  });
});

describe("execute_rhel_command", () => {
  let ssh: SSHConnectionManager;
  let handler: ToolHandler;

  beforeEach(() => {
    ssh = createMockSSH();
    handler = getHandler(createToolRegistry(ssh), "execute_rhel_command");
  });

  it("passes command to SSH and returns output", async () => {
    vi.mocked(ssh.execute).mockResolvedValueOnce("ppc64le");
    const result = await handler.execute({ command: "uname -m" });
    expect(ssh.execute).toHaveBeenCalledWith("uname -m");
    expect(result.content[0]?.text).toBe("ppc64le");
  });

  it("throws when command arg is missing", async () => {
    await expect(handler.execute({})).rejects.toThrow();
  });
});

describe("read_rhel_file", () => {
  let ssh: SSHConnectionManager;
  let handler: ToolHandler;

  beforeEach(() => {
    ssh = createMockSSH();
    handler = getHandler(createToolRegistry(ssh), "read_rhel_file");
  });

  it("uses cat for full file read", async () => {
    vi.mocked(ssh.execute).mockResolvedValueOnce("file contents");
    await handler.execute({ path: "/etc/os-release" });
    expect(ssh.execute).toHaveBeenCalledWith('cat "/etc/os-release"');
  });

  it("uses head when lines is specified", async () => {
    vi.mocked(ssh.execute).mockResolvedValueOnce("line1");
    await handler.execute({ path: "/var/log/messages", lines: 20 });
    expect(ssh.execute).toHaveBeenCalledWith('head -n 20 "/var/log/messages"');
  });

  it("throws on relative path", async () => {
    await expect(handler.execute({ path: "etc/os-release" })).rejects.toThrow();
  });
});

describe("list_rhel_processes", () => {
  let ssh: SSHConnectionManager;
  let handler: ToolHandler;

  beforeEach(() => {
    ssh = createMockSSH();
    handler = getHandler(createToolRegistry(ssh), "list_rhel_processes");
  });

  it("runs ps -ef when no filter", async () => {
    vi.mocked(ssh.execute).mockResolvedValueOnce("PID ...");
    await handler.execute({});
    expect(ssh.execute).toHaveBeenCalledWith("ps -ef");
  });

  it("runs grep with valid alphanumeric filter", async () => {
    vi.mocked(ssh.execute).mockResolvedValueOnce("");
    await handler.execute({ filter: "java" });
    expect(ssh.execute).toHaveBeenCalledWith('ps -ef | grep "java" | grep -v grep');
  });

  it("rejects filter with shell injection characters", async () => {
    await expect(handler.execute({ filter: "$(rm -rf /)" })).rejects.toThrow();
    await expect(handler.execute({ filter: "java; echo evil" })).rejects.toThrow();
    await expect(handler.execute({ filter: "java|evil" })).rejects.toThrow();
  });
});

describe("download_sos_file", () => {
  let ssh: SSHConnectionManager;
  let handler: ToolHandler;

  beforeEach(() => {
    ssh = createMockSSH();
    handler = getHandler(createToolRegistry(ssh), "download_sos_file");
  });

  it("calls downloadFile with correct paths", async () => {
    await handler.execute({ remote_path: "/var/tmp/sosreport.tar.xz", local_filename: "sosreport.tar.xz" });
    expect(ssh.downloadFile).toHaveBeenCalledWith("/var/tmp/sosreport.tar.xz", "./sos/sosreport.tar.xz");
  });

  it("throws when local_filename contains path traversal", async () => {
    await expect(handler.execute({ remote_path: "/tmp/f", local_filename: "../etc/passwd" })).rejects.toThrow();
  });
});

describe("representative RHEL commands", () => {
  it("includes ppc64le architecture command in system info", async () => {
    const ssh = createMockSSH(new Map([
      ["uname -m", "ppc64le"],
    ]));
    const handler = getHandler(createToolRegistry(ssh), "get_rhel_system_info");
    const result = await handler.execute({});
    expect(ssh.execute).toHaveBeenCalledWith("uname -m");
    expect(result.content[0]?.text).toContain("ppc64le");
  });

  it("runs a read-only RHEL health check command set", async () => {
    const ssh = createMockSSH(new Map([
      ["uname -m", "ppc64le"],
    ]));
    const handler = getHandler(createToolRegistry(ssh), "health_check_rhel");
    const result = await handler.execute({});
    expect(ssh.execute).toHaveBeenCalledWith("uname -m");
    expect(ssh.execute).toHaveBeenCalledWith("systemctl --failed --no-pager");
    expect(ssh.execute).toHaveBeenCalledWith("df -hT");
    expect(result.content[0]?.text).toContain("ppc64le");
  });

  it("maps vmstat metric to correct command", async () => {
    const ssh = createMockSSH();
    vi.mocked(ssh.execute).mockResolvedValue("");
    const handler = getHandler(createToolRegistry(ssh), "collect_performance_data");
    await handler.execute({ interval: 2, count: 3, metrics: ["vmstat"] });
    expect(ssh.execute).toHaveBeenCalledWith("vmstat 2 3");
  });

  it("lists block devices with the expected Linux command", async () => {
    const ssh = createMockSSH();
    vi.mocked(ssh.execute).mockResolvedValue("");
    const handler = getHandler(createToolRegistry(ssh), "list_rhel_devices");
    await handler.execute({ device_class: "block" });
    expect(ssh.execute).toHaveBeenCalledWith("lsblk -o NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,MODEL,SERIAL");
  });

  it("checks journal with the requested priority and timeframe", async () => {
    const ssh = createMockSSH();
    vi.mocked(ssh.execute).mockResolvedValue("");
    const handler = getHandler(createToolRegistry(ssh), "analyze_journal");
    await handler.execute({ priority: "err", hours: 6, unit: "sshd.service" });
    expect(ssh.execute).toHaveBeenCalledWith('journalctl --since "6 hours ago" -p err -u "sshd.service" --no-pager | tail -n 200');
  });
});

describe("get_users_and_groups", () => {
  it("queries both users and groups when target is 'all'", async () => {
    const ssh = createMockSSH();
    vi.mocked(ssh.execute).mockResolvedValue("");
    const handler = getHandler(createToolRegistry(ssh), "get_users_and_groups");
    await handler.execute({ target: "all" });
    expect(ssh.execute).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid target value", async () => {
    const ssh = createMockSSH();
    const handler = getHandler(createToolRegistry(ssh), "get_users_and_groups");
    await expect(handler.execute({ target: "invalid" })).rejects.toThrow();
  });
});
