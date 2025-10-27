import {
    DeleteObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class S3Service {
    async upload(file: any, key: string) {
        const region = process.env.AWS_REGION;
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const bucket = process.env.S3_BUCKET_NAME;

        if (!region || !accessKeyId || !secretAccessKey || !bucket) {
            throw new InternalServerErrorException(
                'S3 configuration is missing on the server',
            );
        }

        const s3 = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        try {
            const response = await s3.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                }),
            );
            // Public URL format. Adjust if you use a custom domain / CDN.
            return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
        } catch (err) {
            console.log('Error:', err);
            throw new InternalServerErrorException(
                'Failed to upload image to S3',
            );
        }
    }

    async delete(key: string) {
        const region = process.env.AWS_REGION;
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const bucket = process.env.S3_BUCKET_NAME;

        if (!region || !accessKeyId || !secretAccessKey || !bucket) {
            throw new InternalServerErrorException(
                'S3 configuration is missing on the server',
            );
        }

        const s3 = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        try {
            await s3.send(
                new DeleteObjectCommand({
                    Bucket: bucket,
                    Key: key,
                }),
            );
            return true;
        } catch (err) {
            console.log('Error:', err);
            throw new InternalServerErrorException(
                'Failed to delete file from S3',
            );
        }
    }
}
