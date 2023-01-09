import * as cdk from "aws-cdk-lib";
import * as gw from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { StackProps } from "./stackProps";

const services = ["user"];

export class GeneralRegionalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    if (!props) {
      throw new Error("props not defined.");
    }

    if (!props.env) {
      throw new Error("props.env not defined.");
    }

    if (!props.environmentName) {
      throw new Error("props.environmentName not defined.");
    }

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
    });

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

    // const service = new gw.LambdaRestApi.fromRestApiId(
    //   this,
    //   "",

    // )

    const bucketName = addPrefix("data", props);
    const bucket = new s3.Bucket(this, bucketName, {
      encryption: s3.BucketEncryption.S3_MANAGED,
      accessControl: s3.BucketAccessControl.PRIVATE,
      enforceSSL: true,
    });

    new cdk.CfnOutput(this, "BucketArn", {
      value: bucket.bucketArn,
    });
  }
}

const addPrefix = (source: string, stackProps: StackProps): string => {
  return `${stackProps.environmentName}-${stackProps.env?.region}-${source}`;
};
