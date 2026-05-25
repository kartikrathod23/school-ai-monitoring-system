import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const mlQueue = new Queue(
  "ml-processing",
  {
    connection: redisConnection,
  }
);