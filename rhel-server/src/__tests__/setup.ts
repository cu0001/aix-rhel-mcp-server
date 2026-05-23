// Set required env vars so config.ts can be imported without throwing
process.env["RHEL_HOST"] = "test-rhel-host";
process.env["RHEL_USERNAME"] = "test-user";
process.env["RHEL_PASSWORD"] = "test-pass";
delete process.env["PROXY_HOST"];
delete process.env["PROXY_USERNAME"];
