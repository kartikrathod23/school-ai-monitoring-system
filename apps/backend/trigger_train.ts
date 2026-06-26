import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const prisma = new PrismaClient();
const redisConnection = new IORedis("redis://localhost:6379");
const mlQueue = new Queue("ml-processing", { connection: redisConnection });

async function run() {
  const sectionId = "4dc7c758-24d9-46d0-83ff-0649ad5363e2";
  const job = await prisma.mlProcessingJob.create({
    data: {
      jobType: "TRAIN_CLASSIFIER",
      status: "PENDING",
      sectionId,
    },
  });

  await mlQueue.add("TRAIN_CLASSIFIER", {
    type: "TRAIN_CLASSIFIER",
    mlJobId: job.id,
    sectionId,
    version: "v1",
  });
  console.log("Triggered training for section:", sectionId);
  process.exit(0);
}
run();
