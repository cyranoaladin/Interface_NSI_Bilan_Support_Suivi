const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

async function main() {
  const [, , bucket, key, outFile] = process.argv;
  if (!bucket || !key || !outFile) {
    console.error('Usage: node download_s3.js <bucket> <key> <outFile>');
    process.exit(1);
  }
  const client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY }
  });
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const res = await client.send(cmd);
  await fs.promises.mkdir(path.dirname(outFile), { recursive: true });
  const ws = fs.createWriteStream(outFile);
  await new Promise((resolve, reject) => {
    res.Body.pipe(ws);
    res.Body.on('error', reject);
    ws.on('finish', resolve);
    ws.on('error', reject);
  });
  console.log('Downloaded', `s3://${bucket}/${key}`, '->', outFile);
}

main().catch(e => { console.error(e); process.exit(1); });

