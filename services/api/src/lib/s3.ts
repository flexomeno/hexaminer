import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "./config";

export const s3 = new S3Client({});

export async function getImageFromS3(key: string): Promise<Buffer> {
  const object = await s3.send(
    new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    }),
  );

  if (!object.Body) {
    throw new Error("Image body is empty");
  }

  const bytes = await object.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function createUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
  return uploadUrl;
}
