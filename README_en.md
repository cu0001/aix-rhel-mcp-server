# AIX / RHEL ppc64le MCP Servers

This repository contains Model Context Protocol (MCP) servers that let IBM Bob operate IBM AIX and RHEL (ppc64le) systems over SSH.

[Japanese README](README.md)

## Introduction Video

[![AIX / RHEL ppc64le MCP Servers Introduction](image/samnail.jpg)](https://youtu.be/vO_sZmYnuLo?si=emtaYyy_URIqUB-l)

## Project Structure

```
aix-rhel-mcp-server/
├── aix-server/                  # MCP server for AIX
│   ├── src/
│   ├── build/
│   ├── package.json
│   └── README.md
├── rhel-server/                 # MCP server for RHEL ppc64le
│   ├── src/
│   ├── build/
│   ├── package.json
│   └── README.md
├── .bob/skills/                 # IBM Bob skill definitions
├── mcp_setting.json.example     # MCP configuration example
├── README.md
└── README_en.md
```

## Prerequisites

- Node.js v18 or later
- npm
- IBM Bob
- SSH access to the target AIX or RHEL ppc64le system

## Setup

First, clone the repository:

```bash
git clone https://github.com/cu0001/aix-rhel-mcp-server.git
cd aix-rhel-mcp-server
```

For AIX:

```bash
cd aix-server
npm install
npm run build
```

For RHEL ppc64le:

```bash
cd rhel-server
npm install
npm run build
```

Run the setup commands in both directories if you want to use both MCP servers.

## IBM Bob / MCP Configuration

Create `.bob/mcp.json` in the project root:

```bash
mkdir -p .bob
cp mcp_setting.json.example .bob/mcp.json
```

Edit `.bob/mcp.json` for your environment. AIX and RHEL can be registered at the same time.

```json
{
  "mcpServers": {
    "aix": {
      "command": "node",
      "args": [
        "./aix-server/build/index.js"
      ],
      "env": {
        "AIX_HOST": "your-aix-hostname-or-ip",
        "AIX_PORT": "22",
        "AIX_USERNAME": "your-username",
        "AIX_PASSWORD": "your-password"
      },
      "disabled": false
    },
    "rhel": {
      "command": "node",
      "args": [
        "./rhel-server/build/index.js"
      ],
      "env": {
        "RHEL_HOST": "your-rhel-hostname-or-ip",
        "RHEL_PORT": "22",
        "RHEL_USERNAME": "your-username",
        "RHEL_PRIVATE_KEY": "your-private-key-path"
      },
      "disabled": false
    }
  }
}
```

## Environment Variables

### AIX

- `AIX_HOST` required: AIX hostname or IP address
- `AIX_PORT` optional: SSH port, default `22`
- `AIX_USERNAME` required: SSH username
- `AIX_PASSWORD` optional: SSH password
- `AIX_PRIVATE_KEY` optional: SSH private key

Either `AIX_PASSWORD` or `AIX_PRIVATE_KEY` is required.

### RHEL ppc64le

- `RHEL_HOST` required: RHEL hostname or IP address
- `RHEL_PORT` optional: SSH port, default `22`
- `RHEL_USERNAME` required: SSH username
- `RHEL_PASSWORD` optional: SSH password
- `RHEL_PRIVATE_KEY` optional: SSH private key

Either `RHEL_PASSWORD` or `RHEL_PRIVATE_KEY` is required.

### Proxy / Bastion

Both servers support the same proxy variables:

- `PROXY_HOST`
- `PROXY_PORT`
- `PROXY_USERNAME`
- `PROXY_PASSWORD`
- `PROXY_PRIVATE_KEY`

When `PROXY_HOST` and `PROXY_USERNAME` are set, the server connects through the proxy. Proxy connections require either `PROXY_PASSWORD` or `PROXY_PRIVATE_KEY`.

## Available Tools

### AIX

- `execute_aix_command`
- `get_aix_system_info`
- `health_check_aix`
- `list_aix_devices`
- `check_aix_errors`
- `get_aix_performance`
- `list_aix_filesystems`
- `get_aix_network_info`
- `list_aix_processes`
- `get_aix_users`
- `read_aix_file`
- `collect_snap`
- `download_snap_file`
- `collect_perfpmr`
- `collect_nmon`
- `download_perfpmr_file`
- `download_nmon_file`
- `analyze_errpt`
- `analyze_syslog`
- `collect_performance_data`
- `check_dump_config`
- `get_lpar_config`
- `get_kernel_params`
- `get_users_and_groups`
- `get_path_commands`
- `get_standard_config_files`
- `get_system_limits`
- `list_filesets`

### RHEL ppc64le

- `execute_rhel_command`
- `get_rhel_system_info`
- `health_check_rhel`
- `get_rhel_power_info`
- `list_rhel_devices`
- `get_rhel_services`
- `check_rhel_errors`
- `get_rhel_performance`
- `collect_performance_data`
- `list_rhel_filesystems`
- `get_rhel_network_info`
- `list_rhel_processes`
- `get_rhel_users`
- `read_rhel_file`
- `collect_sosreport`
- `download_sos_file`
- `analyze_journal`
- `analyze_syslog`
- `check_dump_config`
- `get_kernel_params`
- `get_users_and_groups`
- `get_path_commands`
- `get_standard_config_files`
- `get_system_limits`
- `list_packages`

## Examples

```text
Get AIX system information.
```

```text
Get RHEL ppc64le CPU and OS information.
```

```text
Check RHEL errors from the last 24 hours.
```

```text
Run "oslevel -s" on AIX.
```

```text
Run "uname -m" on RHEL.
```

## Usage Patterns

### Using IBM Bob Skills

`.bob/skills` contains six IBM Bob skills, split by OS and use case. When asking IBM Bob, explicitly mention the target OS and the intended workflow.

| Purpose | AIX Skill | RHEL ppc64le Skill |
| --- | --- | --- |
| Normal operations | `aix_normal_operations.md` | `rhel_normal_operations.md` |
| Incident analysis | `aix_incident_analysis.md` | `rhel_incident_analysis.md` |
| Version/config comparison | `aix_version_comparison.md` | `rhel_version_comparison.md` |

Example prompts:

```text
Use the AIX normal operations skill to run a health check on the target AIX system.
```

```text
Use the RHEL incident analysis skill to perform initial triage on the target RHEL ppc64le system.
```

```text
Use the AIX version comparison skill to compare aix-server1 and aix-server2.
```

```text
Use the RHEL version comparison skill to compare OS, kernel, and RPM differences between rhel-server1 and rhel-server2.
```

Notes:

- Normal-operation skills focus on read-only checks.
- Incident-analysis skills start with read-only checks, then collect `snap`, `perfpmr`, `nmon`, or `sos report` only when needed.
- Version comparison assumes two MCP servers are registered. Name them clearly in `.bob/mcp.json`, such as `aix-server1` / `aix-server2` or `rhel-server1` / `rhel-server2`.
- When report output is requested, skills are designed to save Markdown reports under `Bob-report`.

### Normal Operations

For normal operations, prefer read-only tools. Start with `health_check_aix` or `health_check_rhel`, then use focused tools for any area that needs more detail.

```text
Run a normal AIX health check. Check OS level, errpt, CPU/memory, filesystems, and network, then summarize only notable findings.
```

```text
Run a normal RHEL ppc64le health check. Check failed services, warning-or-higher journal entries, CPU/memory, and filesystems.
```

Recommended normal-operation tools:

- AIX: `health_check_aix`, `get_aix_system_info`, `check_aix_errors`, `get_aix_performance`, `list_aix_filesystems`, `get_aix_network_info`
- RHEL: `health_check_rhel`, `get_rhel_system_info`, `check_rhel_errors`, `get_rhel_performance`, `list_rhel_filesystems`, `get_rhel_network_info`, `get_rhel_services`

### Incident Investigation

For incident investigation, begin with read-only checks, then run diagnostic collection only when needed. `snap`, `perfpmr`, `nmon`, and `sos report` can take time, require privileges, or add load, so specify duration and output directories.

```text
Run initial AIX incident triage. Use health_check_aix, detailed errpt, dump configuration, and performance status, then suggest the next diagnostic data to collect.
```

```text
Collect nmon on AIX every 10 seconds for 60 samples into /tmp/mcp-nmon. After completion, show the generated .nmon filename.
```

```text
Collect perfpmr on AIX for 300 seconds into /tmp/mcp-perfpmr. After completion, list the generated files.
```

```text
Run initial RHEL ppc64le incident triage. Check health_check_rhel, journal, kdump, performance status, and failed services.
```

Recommended incident tools:

- AIX: `health_check_aix`, `analyze_errpt`, `analyze_syslog`, `check_dump_config`, `collect_snap`, `collect_perfpmr`, `collect_nmon`, `download_snap_file`, `download_perfpmr_file`, `download_nmon_file`
- RHEL: `health_check_rhel`, `analyze_journal`, `analyze_syslog`, `check_dump_config`, `collect_sosreport`, `download_sos_file`

### Diagnostic File Handling

Use fixed output directories so collected files are easy to find and download.

- AIX nmon: `/tmp/mcp-nmon`
- AIX perfpmr: `/tmp/mcp-perfpmr`
- AIX snap: `/tmp/mcp-snap`
- RHEL sosreport: `/var/tmp`

After collection, confirm the generated filename and download it with the matching `download_*_file` tool.

## Development Commands

```bash
cd aix-server
npm test
npm run build
```

```bash
cd rhel-server
npm test
npm run build
```

## Security Notes

- Keep SSH credentials secure.
- Do not commit `.bob/mcp.json`, `.mcp_settings.json`, or other files containing credentials.
- Prefer SSH key authentication in production.
- Use target-system accounts with the minimum required privileges.
- `execute_*_command` tools can run arbitrary commands, so manage users and target privileges carefully.

## Troubleshooting

### MCP server does not start

- Confirm `npm run build` succeeds.
- Confirm `aix-server/build/index.js` or `rhel-server/build/index.js` exists.
- Check `.bob/mcp.json` syntax and `args` paths.

### SSH connection errors

- Check the relevant `AIX_*` or `RHEL_*` hostname, username, and credentials.
- Confirm the target system accepts SSH connections.
- If using a proxy, check the `PROXY_*` values and network reachability from the proxy to the target.

### Command errors

- Confirm the SSH user has the required permissions.
- Confirm the command exists and is valid for the target OS.
- Diagnostic commands such as `sos report`, `snap`, and kdump checks may require root privileges or additional packages.

## Disclaimer

This code is provided as-is, without warranty. Test carefully in a non-production environment before use.
