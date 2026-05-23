// Set required env vars so config.ts can be imported without throwing
process.env["AIX_HOST"] = "test-aix-host";
process.env["AIX_USERNAME"] = "test-user";
process.env["AIX_PASSWORD"] = "test-pass";
delete process.env["PROXY_HOST"];
delete process.env["PROXY_USERNAME"];
