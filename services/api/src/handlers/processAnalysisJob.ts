import type { SQSEvent } from "aws-lambda";
import {
  addShoppingListItem,
  getAnalysisJobMeta,
  updateAnalysisJobStatus,
} from "../lib/dynamo";
import { runAnalyzeProductPipeline } from "../lib/analyzePipeline";

type MessageBody = {
  jobId: string;
  userId: string;
  imageKeys: string[];
};

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    let jobId = "";
    let userId = "";
    try {
      const body = JSON.parse(record.body) as MessageBody;
      jobId = body.jobId;
      userId = body.userId;
      const imageKeys = body.imageKeys;

      if (!jobId || !userId || !Array.isArray(imageKeys) || imageKeys.length === 0) {
        console.error("Invalid SQS message", record.body);
        continue;
      }

      const existing = await getAnalysisJobMeta(jobId, userId);
      if (!existing) {
        console.error("Job meta missing", jobId);
        continue;
      }
      if (existing.status === "COMPLETED" || existing.status === "FAILED") {
        continue;
      }

      await updateAnalysisJobStatus({
        jobId,
        userId,
        status: "PROCESSING",
      });

      const { product } = await runAnalyzeProductPipeline({
        imageKeys,
        userId,
      });

      await updateAnalysisJobStatus({
        jobId,
        userId,
        status: "COMPLETED",
        productUid: product.uid,
      });

      try {
        await addShoppingListItem({ userId, product });
      } catch (e) {
        console.warn("addShoppingListItem failed", e);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("processAnalysisJob failed", jobId, msg);
      if (jobId && userId) {
        await updateAnalysisJobStatus({
          jobId,
          userId,
          status: "FAILED",
          errorMessage: msg.slice(0, 500),
        });
      }
    }
  }
};
