import * as gwv2 from "@aws-cdk/aws-apigatewayv2";
import * as events from "@aws-cdk/aws-events";
import * as targets from "@aws-cdk/aws-events-targets";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sources from "@aws-cdk/aws-lambda-event-sources";
import * as s3 from "@aws-cdk/aws-s3";
import * as sqs from "@aws-cdk/aws-sqs";
import * as cdk from "@aws-cdk/core";
import { addPrefix } from "./helpers";
import { ServiceName, StackProps } from "./types";

// const regions = ["eu-west-1", "us-east-1"];
// const environmentRegions: EnvironmentName[] = [];
const services: ServiceName[] = [ServiceName.User, ServiceName.Order];
// targets.LambdaFunction

export class GeneralRegionalStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: StackProps) {
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
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
      environment: {
        environment: props.environmentName,
      },
    });

    // const lambdaApiName = addPrefix("LambdaApi", props);
    // const lambdaRestApi = new gw.LambdaRestApi(this, lambdaApiName, {
    //   deploy: true,
    //   restApiName: lambdaApiName,
    //   description: "Lambda api experiment.",
    //   handler: defaultFunction,
    //   defaultMethodOptions: {
    //     operationName: "DefaultOperation",
    //   },
    // });
    const lambdaHttpApiName = addPrefix("HttpApi", props);
    const lambdaHttpApi = new gwv2.HttpApi(this, lambdaHttpApiName, {
      description: `API Gateway V2 HTTP API for environment ${props.environmentName}`,
      apiName: "HTTP API experiment.",
      createDefaultStage: false,
    });
    const lambdaHttpApiDeploymentName = addPrefix(
      "LambdaHttpApiDeployment",
      props
    );
    const stageId = addPrefix("stage", props);
    const stage = new gwv2.HttpStage(this, stageId, {
      stageName: props.environmentName,
      httpApi: lambdaHttpApi,
    });

    new cdk.CfnOutput(this, "LambdaHttpApiId", {
      value: lambdaHttpApi.apiId,
    });

    services.forEach((service) => {
      const deadLetterQueueName = addPrefix(
        `${service}-DeadLetterQueue`,
        props
      );
      const deadLetterQueue = new sqs.Queue(this, deadLetterQueueName, {
        queueName: deadLetterQueueName,
        encryption: sqs.QueueEncryption.KMS_MANAGED,
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
      const queue = new sqs.Queue(this, queueName, {
        queueName,
        encryption: sqs.QueueEncryption.KMS_MANAGED,
        visibilityTimeout: cdk.Duration.seconds(30),
        deadLetterQueue: {
          queue: deadLetterQueue,
          maxReceiveCount: 10,
        },
      });
      new cdk.CfnOutput(this, `${queueName}Name`, {
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
        code: lambda.Code.fromAsset(`../services/${service}/api/build`),
        functionName: serviceApiLambdaName,
        runtime: lambda.Runtime.NODEJS_16_X,
        handler: "index.handler",
        environment: {
          environment: props.environmentName,
        },
        
      });

      lambda.

      // const plugin = new lambda.plugin

      // const serviceLambdaIntegration = new gw.LambdaIntegration(
      //   serviceApiLambda,
      //   {
      //     connectionType: gw.ConnectionType.INTERNET,
      //   }
      // );

      // lambdaRestApi.

      const serviceQueueLambdaName = addPrefix(`${service}-QueueLambda`, props);
      const serviceQueueLambda = new lambda.Function(
        this,
        serviceQueueLambdaName,
        {
          code: lambda.Code.fromAsset(
            `../services/${service}/messageconsumer/build`
          ),
          functionName: serviceQueueLambdaName,
          runtime: lambda.Runtime.NODEJS_16_X,
          handler: "index.handler",
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
          code: lambda.Code.fromAsset(`../services/${service}/cron/build`),
          functionName: serviceCronLambdaName,
          runtime: lambda.Runtime.NODEJS_16_X,
          handler: "index.handler",
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
