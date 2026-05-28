import prisma from "../config/prisma";

export const processMealJob =
  async (data:any) => {
    console.log("Meal Processing:",data);
    await prisma.mlProcessingJob.update({
      where:{
        id:data.mlJobId,
      },

      data:{
        status:"PROCESSING",
        startedAt:new Date(),
      },
    });

    await new Promise((resolve) =>
      setTimeout(resolve,5000)
    );

    const totalCount = Math.floor(Math.random() * 10) + 30;

    await prisma.mealSession.update({
      where:{
        id:data.mealSessionId,
      },

      data:{
        totalDetected:totalCount,
        confidenceScore:0.88,
        status:"PROCESSED",
      },
    });

    await prisma.mlProcessingJob.update({
      where:{
        id:data.mlJobId,
      },

      data:{
        status:"COMPLETED",
        completedAt:new Date(),
      },
    });

    console.log("Meal Processing Completed");
};