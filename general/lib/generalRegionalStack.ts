// import * as gw from "@aws-cdk/aws-apigateway";
// import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "aws-cdk-lib";
import {
  aws_apigatewayv2,
  aws_events,
  aws_events_targets,
  aws_lambda,
  aws_lambda_event_sources,
  aws_logs,
  aws_s3,
  aws_sqs,
  Duration,
  RemovalPolicy,
} from "aws-cdk-lib";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { addPrefix } from "./helpers";
import { ServiceName, StackProps } from "./types";

// const regions = ["eu-west-1", "us-east-1"];
// const environmentRegions: EnvironmentName[] = [];
const services: ServiceName[] = [ServiceName.User];
// aws_events_targets.LambdaFunction

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
    const defaultFunction = new aws_lambda.Function(this, defaultFunctionName, {
      code: new aws_lambda.InlineCode(
        "exports.handler = async (event) => console.log(event)"
      ),
      functionName: defaultFunctionName,
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
      environment: {
        environment: props.environmentName,
      },
    });

    const lambdaRestApiLogGroupId = addPrefix("LambdaRestApiLogs", props);
    const lambdaRestApiLogGroup = new aws_logs.LogGroup(
      this,
      lambdaRestApiLogGroupId,
      {
        logGroupName: lambdaRestApiLogGroupId,
        retention: RetentionDays.ONE_DAY,
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );

    // --- begin api gateway rest api
    // const lambdaRestApiId = addPrefix("LambdaRestApi", props);
    // const lambdaRestApi = new gw.LambdaRestApi(this, lambdaRestApiId, {
    //   deploy: true,
    //   proxy: false,
    //   restApiName: lambdaRestApiId,
    //   description: "Lambda api experiment.",
    //   handler: defaultFunction,
    //   defaultMethodOptions: {
    //     operationName: "DefaultOperation",
    //     authorizationType: gw.AuthorizationType.NONE,
    //   },
    //   deployOptions: {
    //     accessLogDestination: new gw.LogGroupLogDestination(
    //       lambdaRestApiLogGroup
    //     ),
    //   },
    // });

    // const lambdaRestApiDeploymentId = addPrefix(
    //   "LambdaHttpApiDeployment",
    //   props
    // );

    // TODO: Remove?
    // const lambdaRestApiStageId = addPrefix("api-stage", props);
    // const lambdaRestApiStageIdStage = new gw.Stage(this, lambdaRestApiStageId, {
    //   stageName: props.environmentName.toString(),
    //   accessLogDestination: new gw.LogGroupLogDestination(
    //     lambdaRestApiLogGroup
    //   ),
    //   deployment: new gw.Deployment(this, lambdaRestApiDeploymentId, {
    //     api: lambdaRestApi,
    //     retainDeployments: false,
    //   }),
    // });

    // new cdk.CfnOutput(this, "LambdaRestApiId", {
    //   value: lambdaRestApi.restApiId,
    // });

    // --- end api gateway rest api

    const lambdaHttpApiName = addPrefix("HttpApi", props);
    const lambdaHttpApi = new aws_apigatewayv2.CfnApi(this, lambdaHttpApiName, {
      description: `API Gateway V2 HTTP API for environment ${props.environmentName}`,
      name: "HTTP API experiment.",
      protocolType: "HTTP",
    });
    lambdaHttpApi.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // const lambdaHttpApiDeploymentName = addPrefix(
    //   "LambdaHttpApiDeployment",
    //   props
    // );

    const stageId = addPrefix("stage", props);

    const stage = new aws_apigatewayv2.CfnStage(this, stageId, {
      stageName: props.environmentName,
      apiId: lambdaHttpApi.attrApiId,
      autoDeploy: true, // props.environmentName == EnvironmentName.Development,
    });

    new cdk.CfnOutput(this, "LambdaHttpApiEndpoint", {
      value: lambdaHttpApi.attrApiEndpoint,
    });

    services.forEach((service) => {
      const deadLetterQueueName = addPrefix(
        `${service}-DeadLetterQueue.fifo`,
        props
      );
      const deadLetterQueue = new aws_sqs.Queue(this, deadLetterQueueName, {
        queueName: deadLetterQueueName,
        encryption: aws_sqs.QueueEncryption.KMS_MANAGED,
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
      const queue = new aws_sqs.Queue(this, queueName, {
        queueName,
        encryption: aws_sqs.QueueEncryption.KMS_MANAGED,
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
      const bucket = new aws_s3.Bucket(this, bucketName, {
        encryption: aws_s3.BucketEncryption.S3_MANAGED,
        accessControl: aws_s3.BucketAccessControl.PRIVATE,
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
      const serviceApiLambda = new aws_lambda.Function(
        this,
        serviceApiLambdaName,
        {
          code: aws_lambda.Code.fromAsset(
            `../dotnet-services/${service}/${service}Service.Api/bin/debug/net6.0`
          ),
          functionName: serviceApiLambdaName,
          runtime: aws_lambda.Runtime.DOTNET_6,
          handler: `${service}Service.Api`,
          environment: {
            environment: props.environmentName,
          },
        }
      );

      // new aws_apigatewayv2.CfnIntegration(
      //   this,
      //   `${serviceApiLambdaName}-gw-integration`,
      //   {
      //     apiId: lambdaHttpApi.attrApiId,
      //     integrationType: "AWS_PROXY",
      //     connectionType: "INTERNET",
      //     integrationMethod: "ANY",
      //     payloadFormatVersion: "2.0",
      //   }
      // );
      new aws_apigatewayv2.CfnRoute(this, `${serviceApiLambdaName}Route`, {
        apiId: lambdaHttpApi.attrApiId,
        routeKey: "ANY /userService/{proxy+}",
        target: serviceApiLambda.functionArn,
      });

      // begin API gateway lambda integration v1
      /*
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
      */

      // const routes = lambdaHttpApi.addRoutes({
      //   path: "userService/{proxy+}",
      //   methods: [aws_apigatewayv2.HttpMethod.ANY],
      //   integration: new HttpLambdaIntegration(
      //     `lambda-integration-${service}`,
      //     lambdaFunction,
      //     {}
      //   ),
      // });

      // const serviceResource = lambdaRestApi.root.addResource(
      //   service.toString(),
      //   {}
      // );
      // serviceResource.addProxy({
      //   anyMethod: true,
      //   defaultIntegration: serviceApiLambdaIntegration,
      //   defaultMethodOptions: {
      //     methodResponses: [
      //       {
      //         statusCode: "200",
      //       },
      //       {
      //         statusCode: "400",
      //       },
      //       {
      //         statusCode: "404",
      //       },
      //       {
      //         statusCode: "500",
      //       },
      //     ],
      //   },
      // });
      // lambdaHttpApi.addRoutes({
      //   path: y,
      //   integration: serviceApiLambdaIntegration,
      // });
      // const apiGateway = gwv2;

      // const plugin = new aws_lambda.plugin

      // const serviceLambdaIntegration = new gw.LambdaIntegration(
      //   serviceApiLambda,
      //   {
      //     connectionType: gw.ConnectionType.INTERNET,
      //   }
      // );

      // lambdaRestApi.

      const serviceQueueLambdaName = addPrefix(`${service}-QueueLambda`, props);
      const serviceQueueLambda = new aws_lambda.Function(
        this,
        serviceQueueLambdaName,
        {
          code: aws_lambda.Code.fromAsset(
            `../services/${service}/messageconsumer/build`
          ),
          functionName: serviceQueueLambdaName,
          runtime: aws_lambda.Runtime.NODEJS_16_X,
          handler: "index.handler",
          environment: {
            environment: props.environmentName,
          },
          deadLetterQueueEnabled: false,
        }
      );
      serviceQueueLambda.addEventSource(
        new aws_lambda_event_sources.SqsEventSource(queue)
      );

      const serviceCronLambdaName = addPrefix(`${service}-CronLambda`, props);
      const serviceCronLambda = new aws_lambda.Function(
        this,
        serviceCronLambdaName,
        {
          code: aws_lambda.Code.fromAsset(`../services/${service}/cron/build`),
          functionName: serviceCronLambdaName,
          runtime: aws_lambda.Runtime.NODEJS_16_X,
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
      const serviceCronLambdaRule = new aws_events.Rule(
        this,
        serviceCronLambdaRuleName,
        {
          schedule: aws_events.Schedule.rate(Duration.minutes(60)),
        }
      );
      serviceCronLambdaRule.addTarget(
        new aws_events_targets.LambdaFunction(serviceCronLambda)
      );
    });
  }
}
