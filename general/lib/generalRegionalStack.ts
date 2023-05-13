import * as gw from "@aws-cdk/aws-apigateway";
// import * as gwintegrations from "@aws-cdk/aws-apigateway";
import * as events from "@aws-cdk/aws-events";
import * as targets from "@aws-cdk/aws-events-targets";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sources from "@aws-cdk/aws-lambda-event-sources";
import * as logs from "@aws-cdk/aws-logs";
import * as s3 from "@aws-cdk/aws-s3";
import * as sqs from "@aws-cdk/aws-sqs";
import * as cdk from "@aws-cdk/core";
import { RemovalPolicy } from "aws-cdk-lib";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { addPrefix } from "./helpers";
import { EnvironmentName, ServiceName, StackProps } from "./types";

// const regions = ["eu-west-1", "us-east-1"];
// const environmentRegions: EnvironmentName[] = [];
const services: ServiceName[] = [ServiceName.User];
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

    const lambdaRestApiLogGroupId = addPrefix("LambdaRestApiLogs", props);
    const lambdaRestApiLogGroup = new logs.LogGroup(
      this,
      lambdaRestApiLogGroupId,
      {
        logGroupName: lambdaRestApiLogGroupId,
        retention: RetentionDays.ONE_DAY,
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );

    const lambdaRestApiId = addPrefix("LambdaRestApi", props);
    const lambdaRestApi = new gw.LambdaRestApi(this, lambdaRestApiId, {
      deploy: true,
      proxy: false,
      restApiName: lambdaRestApiId,
      description: "Lambda api experiment.",
      handler: defaultFunction,
      defaultMethodOptions: {
        operationName: "DefaultOperation",
        authorizationType: gw.AuthorizationType.NONE,
      },
      deployOptions: {
        accessLogDestination: new gw.LogGroupLogDestination(
          lambdaRestApiLogGroup
        ),
      },
    });

    // const lambdaHttpApiName = addPrefix("HttpApi", props);
    // const lambdaHttpApi = new gwv2.HttpApi(this, lambdaHttpApiName, {
    //   description: `API Gateway V2 HTTP API for environment ${props.environmentName}`,
    //   apiName: "HTTP API experiment.",
    //   createDefaultStage: false,
    // });

    // // const lambdaHttpApiDeploymentName = addPrefix(
    // //   "LambdaHttpApiDeployment",
    // //   props
    // // );

    // const stageId = addPrefix("stage", props);
    // const stage = new gwv2.HttpStage(this, stageId, {
    //   stageName: props.environmentName,
    //   httpApi: lambdaHttpApi,
    //   autoDeploy: true, // props.environmentName == EnvironmentName.Development,
    // });

    // new cdk.CfnOutput(this, "LambdaHttpApiId", {
    //   value: lambdaHttpApi.apiId,
    // });

    const lambdaRestApiDeploymentId = addPrefix(
      "LambdaHttpApiDeployment",
      props
    );

    // TODO: Remove?
    const lambdaRestApiStageId = addPrefix("api-stage", props);
    const lambdaRestApiStageIdStage = new gw.Stage(this, lambdaRestApiStageId, {
      stageName: props.environmentName.toString(),
      accessLogDestination: new gw.LogGroupLogDestination(
        lambdaRestApiLogGroup
      ),
      deployment: new gw.Deployment(this, lambdaRestApiDeploymentId, {
        api: lambdaRestApi,
        retainDeployments: false,
      }),
    });

    new cdk.CfnOutput(this, "LambdaRestApiId", {
      value: lambdaRestApi.restApiId,
    });

    services.forEach((service) => {
      const deadLetterQueueName = addPrefix(
        `${service}-DeadLetterQueue.fifo`,
        props
      );
      const deadLetterQueue = new sqs.Queue(this, deadLetterQueueName, {
        queueName: deadLetterQueueName,
        encryption: sqs.QueueEncryption.KMS_MANAGED,
        fifo: true,
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

      const queueName = addPrefix(`${service}-Queue.fifo`, props);
      const queue = new sqs.Queue(this, queueName, {
        queueName,
        encryption: sqs.QueueEncryption.KMS_MANAGED,
        visibilityTimeout: cdk.Duration.seconds(30),
        fifo: true,
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
        removalPolicy: RemovalPolicy.DESTROY,
      });

      new cdk.CfnOutput(this, `${bucketName}Arn`, {
        value: bucket.bucketArn,
      });

      new cdk.CfnOutput(this, `${bucketName}Url`, {
        value: bucket.bucketWebsiteUrl,
      });

      const serviceApiLambdaName = addPrefix(`${service}-ApiLambda`, props);
      const serviceApiLambda = new lambda.Function(this, serviceApiLambdaName, {
        code: lambda.Code.fromAsset(
          `../dotnet-services/${service}/${service}Service.Api/bin/debug/net6.0`
        ),
        functionName: serviceApiLambdaName,
        runtime: lambda.Runtime.DOTNET_6,
        handler: `${service}Service.Api`,
        environment: {
          environment: props.environmentName,
        },
      });

      const serviceApiLambdaIntegration = new gw.LambdaIntegration(
        serviceApiLambda,
        {
          proxy: false,
          connectionType: gw.ConnectionType.INTERNET,
          // passthroughBehavior: gw.PassthroughBehavior.NEVER,
          allowTestInvoke: props.environmentName == EnvironmentName.Development,
          // requestParameters
          requestTemplates: {},
          // integrationResponses: [
          //   {
          //     statusCode: "200",
          //   },
          //   {
          //     statusCode: "400",
          //   },
          //   {
          //     statusCode: "500",
          //   },
          // ],
        }
      );
      const serviceResource = lambdaRestApi.root.addResource(
        service.toString(),
        {}
      );
      serviceResource.addProxy({
        anyMethod: true,
        defaultIntegration: serviceApiLambdaIntegration,
        defaultMethodOptions: {
          methodResponses: [
            {
              statusCode: "200",
            },
            {
              statusCode: "400",
            },
            {
              statusCode: "404",
            },
            {
              statusCode: "500",
            },
          ],
        },
      });
      // lambdaHttpApi.addRoutes({
      //   path: y,
      //   integration: serviceApiLambdaIntegration,
      // });
      // const apiGateway = gwv2;

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
          deadLetterQueueEnabled: false,
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
