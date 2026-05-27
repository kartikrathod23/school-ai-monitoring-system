import { Worker } from "bullmq";
import { redisConnection } from "../config/redis";

import {
  processFaceOnboardingJob,
} from "../services/onboarding.service";

import {
  processAttendanceJob,
} from "../services/attendance.service";

export const mlWorker =
  new Worker(
    "ml-processing",

    async (job) => {

      console.log("Processing Job:",job.id);
      console.log("Job Name:",job.name);

      try {

        switch (job.name) {

          case "FACE_EMBEDDING_GENERATION":

            await processFaceOnboardingJob(
              job.data
            );

            break;

          case "ATTENDANCE_PROCESSING":

            await processAttendanceJob(
              job.data
            );

            break;

          default:

            console.log(
              "Unknown job type:",
              job.name
            );
        }

      } catch (error: any) {

        console.log(
          "Worker Error:"
        );

        console.log(
          error.message
        );

        throw error;
      }
    },

    {
      connection:
        redisConnection,

      concurrency: 2,
    }
  );

mlWorker.on(
  "completed",

  (job) => {

    console.log(
      `Completed Job ${job.id}`
    );
  }
);

mlWorker.on(
  "failed",

  (job,error) => {

    console.log(
      `Failed Job ${job?.id}`
    );

    console.log(
      error.message
    );
  }
);