import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from './env';
export const s3 = new S3Client({
  region: env.S3_REGION, endpoint: env.S3_ENDPOINT, forcePathStyle: true,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
});
export async function putPdf(key:string, body:Buffer){
  await s3.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key:key, Body:body, ContentType:'application/pdf' }));
  return `s3://${env.S3_BUCKET}/${key}`;
}

