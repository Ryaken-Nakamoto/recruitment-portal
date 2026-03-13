import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client = new S3Client({
    region: process.env.REGION ?? 'us-east-1',
  });
  private readonly bucket = process.env.AWS_RESUMES_BUCKET;

  async uploadResume(
    key: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      const url = `https://${this.bucket}.s3.us-east-1.amazonaws.com/${key}`;
      this.logger.log(`Resume uploaded to S3: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to upload resume to S3: ${error.message}`);
      throw error;
    }
  }

  async getResume(key: string): Promise<Readable> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      this.logger.log(`Resume fetched from S3: ${key}`);
      return response.Body as Readable;
    } catch (error) {
      this.logger.error(`Failed to fetch resume from S3: ${error.message}`);
      throw error;
    }
  }
}
