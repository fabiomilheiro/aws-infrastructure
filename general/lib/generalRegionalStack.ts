import * as cdk from "aws-cdk-lib";
import * as gw from "aws-cdk-lib/aws-apigateway";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sources from "aws-cdk-lib/aws-lambda-event-sources";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { EnvironmentName, ServiceName, StackProps } from "./types";

const regions = ["eu-west-1", "us-east-1"];
const environmentRegions: EnvironmentName[] = [];
const services: ServiceName[] = [ServiceName.User, ServiceName.Messaging];

export class GeneralRegionalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    if (!props) {
      throw new Error("props not defined.");
    }

    if (!props.env || !props.env.account || !props.env.region) {
      throw new Error("props.env or its properties not defined.");
    }

    const defaultFunctionName = addPrefix("default", props);
    const defaultFunction = new lambda.Function(this, defaultFunctionName, {
      code: new lambda.InlineCode(
        "exports.handler = async (event) => console.log(event)"
      ),
      functionName: defaultFunctionName,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      environment: {
        environment: props.environmentName,
      },
    });

    const lamdaApiName = addPrefix("LambdaApi", props);
    const lambdaRestApi = new gw.LambdaRestApi(this, lamdaApiName, {
      deploy: true,
      restApiName: lamdaApiName,
      description: "Lambda api experiment.",
      handler: defaultFunction,
      defaultMethodOptions: {
        operationName: "DefaultOperation",
      },
    });

    const deploymentName = addPrefix("LambdaRestApiDeployment", props);
    const deployment = new gw.Deployment(this, deploymentName, {
      api: lambdaRestApi,
    });

    const stageName = props.environmentName;
    lambdaRestApi.deploymentStage = new gw.Stage(this, stageName, {
      deployment: deployment,
      stageName: stageName,
    });

    new cdk.CfnOutput(this, "LambdaRestApiId", {
      value: lambdaRestApi.restApiId,
    });

    services.forEach((service) => {
      const deadLetterQueueName = addPrefix(
        `${service}-DeadLetterQueue`,
        props
      );
      const deadLetterQueue = new sqs.Queue(this, deadLetterQueueName, {
        queueName: deadLetterQueueName,
        encryption: sqs.QueueEncryption.KMS_MANAGED,
        enforceSSL: true,
      });
      new cdk.CfnOutput(this, `${deadLetterQueueName}Name`, {
        value: deadLetterQueue.queueName,
      });
      new cdk.CfnOutput(this, `${deadLetterQueueName}Url`, {
        value: deadLetterQueue.queueUrl,
      });
      new cdk.CfnOutput(this, `${deadLetterQueueName}Arn`, {
        value: deadLetterQueue.queueArn,
      });

      const queueName = addPrefix(`${service}-Queue`, props);
      const queue = new sqs.Queue(this, service, {
        queueName,
        encryption: sqs.QueueEncryption.KMS_MANAGED,
        enforceSSL: true,
        visibilityTimeout: cdk.Duration.seconds(30),
        deadLetterQueue: {
          queue: deadLetterQueue,
          maxReceiveCount: 10,
        },
      });
      new cdk.CfnOutput(this, queueName, {
        value: deadLetterQueue.queueName,
      });
      new cdk.CfnOutput(this, `${queueName}Url`, {
        value: deadLetterQueue.queueUrl,
      });
      new cdk.CfnOutput(this, `${queueName}Arn`, {
        value: deadLetterQueue.queueArn,
      });

      const bucketName = addPrefix(`${service}-data`, props);
      const bucket = new s3.Bucket(this, bucketName, {
        encryption: s3.BucketEncryption.S3_MANAGED,
        accessControl: s3.BucketAccessControl.PRIVATE,
        enforceSSL: true,
      });

      new cdk.CfnOutput(this, `${bucketName}Arn`, {
        value: bucket.bucketArn,
      });

      new cdk.CfnOutput(this, `${bucketName}Url`, {
        value: bucket.bucketWebsiteUrl,
      });

      const serviceApiLambdaName = addPrefix(`${service}-ApiLambda`, props);
      const serviceApiLambda = new lambda.Function(this, serviceApiLambdaName, {
        code: lambda.Code.fromAsset(`../services/${service}/app/out`),
        functionName: serviceApiLambdaName,
        runtime: lambda.Runtime.GO_1_X,
        handler: "api",
        environment: {
          environment: props.environmentName,
        },
      });

      const serviceLambdaIntegration = new gw.LambdaIntegration(
        serviceApiLambda,
        {
          connectionType: gw.ConnectionType.INTERNET,
        }
      );

      // lambdaRestApi.

      const serviceQueueLambdaName = addPrefix(`${service}-QueueLambda`, props);
      const serviceQueueLambda = new lambda.Function(
        this,
        serviceQueueLambdaName,
        {
          code: lambda.Code.fromAsset(`../services/${service}/app/out`),
          functionName: serviceQueueLambdaName,
          runtime: lambda.Runtime.GO_1_X,
          handler: "messagehandler",
          environment: {
            environment: props.environmentName,
          },
          deadLetterQueueEnabled: true,
          deadLetterQueue: deadLetterQueue,
        }
      );
      serviceQueueLambda.addEventSource(new sources.SqsEventSource(queue));

      const serviceCronLambdaName = addPrefix(`${service}-CronLambda`, props);
      const serviceCronLambda = new lambda.Function(
        this,
        serviceCronLambdaName,
        {
          code: lambda.Code.fromAsset(`../services/${service}/app/out`),
          functionName: serviceCronLambdaName,
          runtime: lambda.Runtime.GO_1_X,
          handler: "cron",
          environment: {
            environment: props.environmentName,
          },
        }
      );

      const serviceCronLambdaRuleName = addPrefix(
        `${service}-CronLambdaRule`,
        props
      );
      const serviceCronLambdaRule = new events.Rule(
        this,
        serviceCronLambdaRuleName,
        {
          schedule: events.Schedule.rate(cdk.Duration.minutes(60)),
        }
      );
      serviceCronLambdaRule.addTarget(
        new targets.LambdaFunction(serviceCronLambda)
      );
    });
  }
}

const addPrefix = (source: string, stackProps: StackProps): string => {
  return `${stackProps.environmentName}-${stackProps.env?.region}-${source}`;
};
