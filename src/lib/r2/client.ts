import { S3Client } from "@aws-sdk/client-s3";

let r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return r2Client;
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME || "fraijour";
export const R2_PUBLIC_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  "https://pub-cdb650c7bfa1416a8f0e200aea466576.r2.dev";

export function getContentUrl(contentSlug: string, fileName: string): string {
  return `${R2_PUBLIC_URL}/contents/${contentSlug}/${fileName}`;
}

export function getProductImageUrl(sku: string, fileName: string): string {
  return `${R2_PUBLIC_URL}/products/${sku}/${fileName}`;
}
