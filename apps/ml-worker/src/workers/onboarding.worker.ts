import { Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import {processFaceOnboardingJob,} from "../services/onboarding.service";

export const onboardingWorker =
  new Worker( "ml-processing",

    async (job) => {
      console.log("Processing Job:",job.id);
      console.log("Job Name:",job.name);
      console.log("Job Data:",job.data);

      try {
        switch (job.name) {
          case "FACE_EMBEDDING_GENERATION":
            await processFaceOnboardingJob(job.data);
            break;

          default:
            console.log("Unknown job type");
        }

        console.log( "Job completed:",job.id);
      } catch (error: any) {
        console.log("Worker Error:",error.message);
        throw error;
      }
    },

    {
      connection: redisConnection,
      concurrency: 2,
    }
  );

onboardingWorker.on( "completed",
  (job) => {
    console.log(`Completed Job ${job.id}`);
  }
);

onboardingWorker.on("failed",
  (job, error) => {
    console.log(`Failed Job ${job?.id}`);
    console.log(error.message);
  }
);

onboardingWorker.on("error",
  (error) => {
    console.log("Worker Connection Error:");
    console.log(error.message);
  }
);