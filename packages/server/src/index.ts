import { createAppServer } from "./app.js";

const port = Number(process.env.PORT ?? 4100);
const host = process.env.HOST ?? "127.0.0.1";

const start = async (): Promise<void> => {
  const { httpServer } = await createAppServer({
    port,
    dbPath: process.env.WIST_DB_PATH ?? ".data/wist.sqlite",
    databaseUrl: process.env.DATABASE_URL,
    staticDir: process.env.WIST_STATIC_DIR,
    publicAppUrl: process.env.PUBLIC_APP_URL,
    allowTestPresets: process.env.ALLOW_TEST_PRESETS === "1"
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, host, () => {
      resolve();
    });
  });
};

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
