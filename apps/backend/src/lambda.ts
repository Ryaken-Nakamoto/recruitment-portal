/**
 * Lambda Handler Entry Point
 *
 * This file adapts the NestJS application to run as an AWS Lambda function.
 * API Gateway sends HTTP events as JSON; serverless-express converts them to
 * fake Express requests/responses so NestJS never knows the difference.
 *
 * Key design:
 * - cachedHandler: Lambda reuses execution containers for "warm" invocations.
 *   We cache the bootstrapped NestJS app to avoid cold-start overhead on every
 *   request. NestJS initialization (TypeORM connecting to RDS, loading 17 entities)
 *   takes ~3–5 seconds on first invocation.
 * - await app.init() instead of await app.listen():
 *   Lambda doesn't have a port to bind to. serverless-express handles the HTTP.
 */

import { Handler } from 'aws-lambda';
import serverlessExpress from '@vendia/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

let cachedHandler: Handler | undefined;

async function bootstrapServer(): Promise<Handler> {
  const app = await NestFactory.create(AppModule);

  // CORS: Match your production frontend domain.
  // Fallback to '*' for initial testing; replace with your actual Amplify URL.
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Initialize (do NOT call app.listen() — no port in Lambda)
  await app.init();

  // serverless-express wraps the Express instance
  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

/**
 * Lambda handler: entry point for all API Gateway events
 */
export const handler: Handler = async (event, context, callback) => {
  if (!cachedHandler) {
    cachedHandler = await bootstrapServer();
  }
  return cachedHandler(event, context, callback);
};
