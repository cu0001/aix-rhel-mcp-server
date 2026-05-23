# RHEL ppc64le MCP Server

This MCP server lets IBM Bob operate a Red Hat Enterprise Linux system on ppc64le via SSH.

## Setup

```bash
cd rhel-server
npm install
npm run build
```

## MCP Configuration

Add a `rhel` server entry to `.bob/mcp.json`:

```json
{
  "mcpServers": {
    "rhel": {
      "command": "node",
      "args": [
        "./rhel-server/build/index.js"
      ],
      "env": {
        "RHEL_HOST": "your-rhel-hostname-or-ip",
        "RHEL_PORT": "22",
        "RHEL_USERNAME": "your-username",
        "RHEL_PASSWORD": "your-password"
      }
    }
  }
}
```

Use `RHEL_PRIVATE_KEY` instead of `RHEL_PASSWORD` for SSH key authentication.

Proxy / bastion variables are the same as the AIX server:

- `PROXY_HOST`
- `PROXY_PORT`
- `PROXY_USERNAME`
- `PROXY_PASSWORD`
- `PROXY_PRIVATE_KEY`

## Tools

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

## Usage

### Normal Operations

Use `health_check_rhel` first for read-only daily checks, then inspect specific areas as needed.

```text
Run a normal RHEL ppc64le health check. Summarize failed services, warning-or-higher journal entries, CPU/memory, and filesystem status.
```

### Incident Investigation

For incidents, start with `health_check_rhel`, `analyze_journal`, and `check_dump_config`. Use `collect_sosreport` only when deeper diagnostic collection is needed.

```text
Run initial RHEL ppc64le incident triage. Check journal, kdump, performance, and failed services.
```

```text
Collect sos report into /var/tmp and list the generated file.
```
