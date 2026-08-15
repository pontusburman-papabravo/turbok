import PgBoss from "pg-boss";

const WORKER_ALIVE_JOB = "worker.alive";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const boss = new PgBoss(connectionString);
  boss.on("error", (error) => console.error("pg-boss error", error));

  await boss.start();
  await boss.createQueue(WORKER_ALIVE_JOB);

  await boss.work(WORKER_ALIVE_JOB, async () => {
    console.log(JSON.stringify({ level: "info", message: "worker alive", job: WORKER_ALIVE_JOB }));
  });

  await boss.send(WORKER_ALIVE_JOB, { startedAt: new Date().toISOString() });
  console.log(JSON.stringify({ level: "info", message: "worker started" }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
