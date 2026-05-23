#!/usr/bin/env node
import { App } from "aws-cdk-lib";

import { QueueStack } from "../lib/queue-stack";
import { StorageStack } from "../lib/storage-stack";
import { WebStack } from "../lib/web-stack";
import { WorkerStack } from "../lib/worker-stack";

const app = new App();
const env = app.node.tryGetContext("env") ?? "staging";
const region = process.env.AWS_REGION ?? "us-east-1";
const account = process.env.CDK_DEFAULT_ACCOUNT;

const stackEnv = account ? { account, region } : { region };
const suffix = env === "prod" ? "Prod" : "Staging";

const storage = new StorageStack(app, `Layertone${suffix}Storage`, { env: stackEnv, stage: env });
const queues = new QueueStack(app, `Layertone${suffix}Queues`, { env: stackEnv, stage: env });
new WorkerStack(app, `Layertone${suffix}Worker`, {
  env: stackEnv,
  stage: env,
  queueArn: queues.mainQueue.queueArn,
  bucketArn: storage.appBucket.bucketArn,
});
new WebStack(app, `Layertone${suffix}Web`, {
  env: stackEnv,
  stage: env,
  bucketArn: storage.appBucket.bucketArn,
  queueUrl: queues.mainQueue.queueUrl,
});
