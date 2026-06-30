const fs = require("node:fs")
function readEnvFile(path) {
  return Object.fromEntries(fs.readFileSync(path, "utf8")
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf("=")
      return [line.slice(0, index), line.slice(index + 1)]
    }))
}
const pg = readEnvFile("/opt/talabati/secrets/postgres.env")
module.exports = {
  apps: [{
    name: "talabati",
    cwd: "/opt/talabati",
    script: "npm",
    args: "start",
    env: {
      NODE_ENV: "production",
      HOST: "0.0.0.0",
      PORT: "3000",
      PGHOST: "127.0.0.1",
      PGPORT: "5432",
      PGDATABASE: pg.POSTGRES_DB,
      PGUSER: pg.POSTGRES_USER,
      PGPASSWORD: pg.POSTGRES_PASSWORD,
    },
  }],
}
