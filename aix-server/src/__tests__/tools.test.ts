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
  it("registers all existing tools after category split", () => {
    const registry = createToolRegistry(createMockSSH());
    expect(registry.map((h) => h.definition.name)).toEqual([
      "execute_aix_command",
      "get_aix_system_info",
      "health_check_aix",
      "get_lpar_config",
      "get_kernel_params",
      "get_path_commands",
      "get_system_limits",
      "list_filesets",
      "list_aix_devices",
      "check_aix_errors",
      "collect_snap",
      "collect_perfpmr",
      "collect_nmon",
      "download_perfpmr_file",
      "download_nmon_file",
      "analyze_errpt",
      "analyze_syslog",
      "check_dump_config",
      "get_aix_performance",
      "collect_performance_data",
      "list_aix_filesystems",
      "read_aix_file",
      "download_snap_file",
      "get_standard_config_files",
      "get_aix_network_info",
      "list_aix_processes",
      "get_aix_users",
      "get_users_and_groups",
    ]);
  });
});

describe("execute_aix_command", () => {
  let ssh: SSHConnectionManager;
  let handler: ToolHandler;

  beforeEach(() => {
    ssh = createMockSSH();
    handler = getHandler(createToolRegistry(ssh), "execute_aix_command");
  });

  it("passes command to SSH and returns output", async () => {
    vi.mocked(ssh.execute).mockResolvedValueOnce("AIX 7.3");
    const result = await handler.execute({ command: "oslevel -s" });
    expect(ssh.execute).toHaveBeenCalledWith("oslevel -s");
    expect(result.content[0]?.text).toBe("AIX 7.3");
  });

  it("throws when command arg is missing", async () => {
    await expect(handler.execute({})).rejects.toThrow();
  });

  it("throws when command is not a string", async () => {
    await expect(handler.execute({ command: 42 })).rejects.toThrow();
  });
});

describe("read_aix_file", () => {
  let ssh: SSHConnectionManager;
  let handler: ToolHandler;

  beforeEach(() => {
    ssh = createMockSSH();
    handler = getHandler(createToolRegistry(ssh), "read_aix_file");
  });

  it("uses cat for full file read", async () => {
    vi.mocked(ssh.execute).mockResolvedValueOnce("file contents");
    await handler.execute({ path: "/etc/hosts" });
    expect(ssh.execute).toHaveBeenCalledWith('cat "/etc/hosts"');
  });

  it("uses head when lines is specified", async () => {
    vi.mocked(ssh.execute).mockResolvedValueOnce("line1");
    await handler.execute({ path: "/etc/hosts", lines: 10 });
    expect(ssh.execute).toHaveBeenCalledWith('head -n 10 "/etc/hosts"');
  });

  it("throws on relative path", async () => {
    await expect(handler.execute({ path: "etc/hosts" })).rejects.toThrow();
  });

  it("throws when path is missing", async () => {
    await expect(handler.execute({})).rejects.toThrow();
  });
});

describe("list_aix_processes", () => {
  let ssh: SSHConnectionManager;
  let handler: ToolHandler;

  beforeEach(() => {
    ssh = createMockSSH();
    handler = getHandler(createToolRegistry(ssh), "list_aix_processes");
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

describe("download_snap_file", () => {
  let ssh: SSHConnectionManager;
  let handler: ToolHandler;

  beforeEach(() => {
    ssh = createMockSSH();
    handler = getHandler(createToolRegistry(ssh), "download_snap_file");
  });

  it("calls downloadFile with correct paths", async () => {
    await handler.execute({ remote_path: "/tmp/snap.pax.Z", local_filename: "snap.pax.Z" });
    expect(ssh.downloadFile).toHaveBeenCalledWith("/tmp/snap.pax.Z", "./snap/snap.pax.Z");
  });

  it("returns success message with local path", async () => {
    const result = await handler.execute({ remote_path: "/tmp/snap.pax.Z", local_filename: "snap.pax.Z" });
    expect(result.content[0]?.text).toContain("./snap/snap.pax.Z");
  });

  it("throws when remote_path is not absolute", async () => {
    await expect(handler.execute({ remote_path: "tmp/snap.pax.Z", local_filename: "snap.pax.Z" })).rejects.toThrow();
  });

  it("throws when local_filename contains path traversal", async () => {
    await expect(handler.execute({ remote_path: "/tmp/f", local_filename: "../etc/passwd" })).rejects.toThrow();
  });

  it("throws when local_filename contains shell metacharacters", async () => {
    await expect(handler.execute({ remote_path: "/tmp/f", local_filename: "file; evil" })).rejects.toThrow();
  });
});

describe("get_aix_system_info", () => {
  it("calls 5 commands in parallel and joins output", async () => {
    const ssh = createMockSSH(new Map([
      ["oslevel -s", "7300-04-01"],
      ["uname -a", "AIX host 1 7 00F..."],
    ]));
    const handler = getHandler(createToolRegistry(ssh), "get_aix_system_info");
    const result = await handler.execute({});
    expect(ssh.execute).toHaveBeenCalledTimes(5);
    expect(result.content[0]?.text).toContain("oslevel -s");
    expect(result.content[0]?.text).toContain("7300-04-01");
  });
});

describe("health_check_aix", () => {
  it("runs a read-only operational command set", async () => {
    const ssh = createMockSSH(new Map([
      ["oslevel -s", "7300-04-01"],
    ]));
    const handler = getHandler(createToolRegistry(ssh), "health_check_aix");
    const result = await handler.execute({});
    expect(ssh.execute).toHaveBeenCalledWith("oslevel -s");
    expect(ssh.execute).toHaveBeenCalledWith("errpt | head -50");
    expect(ssh.execute).toHaveBeenCalledWith("df -g");
    expect(result.content[0]?.text).toContain("7300-04-01");
  });
});

describe("collect_performance_data", () => {
  it("maps vmstat metric to correct command", async () => {
    const ssh = createMockSSH();
    vi.mocked(ssh.execute).mockResolvedValue("");
    const handler = getHandler(createToolRegistry(ssh), "collect_performance_data");
    await handler.execute({ interval: 2, count: 3, metrics: ["vmstat"] });
    expect(ssh.execute).toHaveBeenCalledWith("vmstat 2 3");
  });

  it("maps netstat metric to netstat -s (no interval/count)", async () => {
    const ssh = createMockSSH();
    vi.mocked(ssh.execute).mockResolvedValue("");
    const handler = getHandler(createToolRegistry(ssh), "collect_performance_data");
    await handler.execute({ metrics: ["netstat"] });
    expect(ssh.execute).toHaveBeenCalledWith("netstat -s");
  });
});

describe("independent AIX collection tools", () => {
  it("collects perfpmr with duration and output directory", async () => {
    const ssh = createMockSSH();
    vi.mocked(ssh.execute).mockResolvedValue("");
    const handler = getHandler(createToolRegistry(ssh), "collect_perfpmr");
    await handler.execute({ duration: 120, output_dir: "/tmp/perfpmr-test" });
    expect(ssh.execute).toHaveBeenCalledWith(
      "mkdir -p /tmp/perfpmr-test && cd /tmp/perfpmr-test && /usr/lpp/perfagent/tools/perfpmr 120"
    );
  });

  it("collects nmon with interval, count, and output directory", async () => {
    const ssh = createMockSSH();
    vi.mocked(ssh.execute).mockResolvedValue("");
    const handler = getHandler(createToolRegistry(ssh), "collect_nmon");
    await handler.execute({ interval: 5, count: 12, output_dir: "/tmp/nmon-test" });
    expect(ssh.execute).toHaveBeenCalledWith(
      "mkdir -p /tmp/nmon-test && cd /tmp/nmon-test && nmon -f -s 5 -c 12 -m /tmp/nmon-test && ls -la /tmp/nmon-test/*.nmon"
    );
  });

  it("rejects relative nmon output directory", async () => {
    const ssh = createMockSSH();
    const handler = getHandler(createToolRegistry(ssh), "collect_nmon");
    await expect(handler.execute({ output_dir: "tmp/nmon" })).rejects.toThrow();
  });

  it("downloads a perfpmr file to the local perfpmr directory", async () => {
    const ssh = createMockSSH();
    const handler = getHandler(createToolRegistry(ssh), "download_perfpmr_file");
    await handler.execute({ remote_path: "/tmp/perfpmr/perfpmr.tar.Z", local_filename: "perfpmr.tar.Z" });
    expect(ssh.downloadFile).toHaveBeenCalledWith("/tmp/perfpmr/perfpmr.tar.Z", "./perfpmr/perfpmr.tar.Z");
  });

  it("downloads a nmon file to the local nmon directory", async () => {
    const ssh = createMockSSH();
    const handler = getHandler(createToolRegistry(ssh), "download_nmon_file");
    await handler.execute({ remote_path: "/tmp/nmon/host_250101_1200.nmon", local_filename: "host_250101_1200.nmon" });
    expect(ssh.downloadFile).toHaveBeenCalledWith("/tmp/nmon/host_250101_1200.nmon", "./nmon/host_250101_1200.nmon");
  });
});

describe("representative category commands", () => {
  it("lists devices with optional class", async () => {
    const ssh = createMockSSH();
    vi.mocked(ssh.execute).mockResolvedValue("");
    const handler = getHandler(createToolRegistry(ssh), "list_aix_devices");
    await handler.execute({ device_class: "disk" });
    expect(ssh.execute).toHaveBeenCalledWith("lsdev -Cc disk");
  });

  it("collects network info with the original command set", async () => {
    const ssh = createMockSSH();
    vi.mocked(ssh.execute).mockResolvedValue("");
    const handler = getHandler(createToolRegistry(ssh), "get_aix_network_info");
    await handler.execute({});
    expect(ssh.execute).toHaveBeenCalledWith("ifconfig -a");
    expect(ssh.execute).toHaveBeenCalledWith("netstat -rn");
    expect(ssh.execute).toHaveBeenCalledWith("lsattr -El inet0");
  });

  it("keeps analyze_errpt enum-compatible behavior", async () => {
    const ssh = createMockSSH();
    vi.mocked(ssh.execute).mockResolvedValue("");
    const handler = getHandler(createToolRegistry(ssh), "analyze_errpt");
    await handler.execute({ severity: "PERM", resource_name: "hdisk0", detail: false });
    expect(ssh.execute).toHaveBeenCalledWith("errpt -T PERM -N hdisk0 | head -n 100");
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

  it("queries only users when target is 'users'", async () => {
    const ssh = createMockSSH();
    vi.mocked(ssh.execute).mockResolvedValue("");
    const handler = getHandler(createToolRegistry(ssh), "get_users_and_groups");
    await handler.execute({ target: "users" });
    expect(ssh.execute).toHaveBeenCalledTimes(1);
    expect(ssh.execute).toHaveBeenCalledWith("lsuser -a id ALL | head -n 200");
  });

  it("rejects invalid target value", async () => {
    const ssh = createMockSSH();
    const handler = getHandler(createToolRegistry(ssh), "get_users_and_groups");
    await expect(handler.execute({ target: "invalid" })).rejects.toThrow();
  });
});
