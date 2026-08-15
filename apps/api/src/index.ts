import { buildApp, loadConfig } from "./app.js";

async function start() {
  const config = loadConfig();
  const app = await buildApp(config);
  await app.listen({ host: config.host, port: config.port });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
