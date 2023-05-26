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

const services: ServiceName[] = [ServiceName.User];

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

    const lambdaHttpApiName = addPrefix("HttpApi", props);
    const lambdaHttpApi = new aws_apigatewayv2.CfnApi(this, lambdaHttpApiName, {
      description: `API Gateway V2 HTTP API for environment ${props.environmentName}`,
      name: "HTTP API experiment.",
      protocolType: "HTTP",
      version: "2.0", // TODO: Remove.
    });
    lambdaHttpApi.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const lambdaRestApiStageLogGroupId = addPrefix("LambdaHttpApiLogs", props);
    const lambdaRestApiStageLogGroup = new aws_logs.LogGroup(
      this,
      lambdaRestApiStageLogGroupId,
      {
        logGroupName: lambdaRestApiStageLogGroupId,
        retention: RetentionDays.ONE_DAY,
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );

    const stageId = addPrefix("stage", props);
    const stage = new aws_apigatewayv2.CfnStage(this, stageId, {
      stageName: props.environmentName,
      apiId: lambdaHttpApi.attrApiId,
      autoDeploy: true,
      accessLogSettings: {
        destinationArn: lambdaRestApiStageLogGroup.logGroupArn,
        format: `{"requestId":"$context.requestId", "extendedRequestId":"$context.extendedRequestId", "ip": "$context.identity.sourceIp", "caller":"$context.identity.caller", "user":"$context.identity.user", "requestTime":"$context.requestTime", "httpMethod":"$context.httpMethod", "resourcePath":"$context.resourcePath", "status":"$context.status", "protocol":"$context.protocol", "responseLength":"$context.responseLength" }`,
      },
    });

    new cdk.CfnOutput(this, "LambdaHttpApiEndpoint", {
      value: lambdaHttpApi.attrApiEndpoint,
    });

    const vpcId = addPrefix("vpc", props);
    const vpc = new cdk.aws_ec2.Vpc(this, vpcId, {});

    new cdk.CfnOutput(this, "VPC", {
      value: vpc.vpcId,
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

      const ecrRepositoryId = addPrefix(`${service}ServiceRepository`, props);
      // const ecrRepository = new cdk.aws_ecr.Repository(this, ecrRepositoryId, {
      //   autoDeleteImages: true,
      //   removalPolicy: RemovalPolicy.DESTROY,
      //   encryption: cdk.aws_ecr.RepositoryEncryption.KMS,
      //   imageTagMutability: cdk.aws_ecr.TagMutability.IMMUTABLE,
      //   repositoryName: ecrRepositoryId,
      // });
      // ecrRepository.addLifecycleRule({
      //   maxImageAge: Duration.days(10),
      //   maxImageCount: 10,
      // });

      const ecrRepository = cdk.aws_ecr.Repository.fromRepositoryArn(
        this,
        ecrRepositoryId,
        "arn:aws:ecr:eu-west-1:715815605776:repository/dev-eu-west-1-ecr-userservice"
      );

      // TODO: 1. ECR 2. Build and push image 3. Deploy infrastructure and image.
      // The problem is that the infrastructure code does 1 and 3. Should it do everything?
      const serviceImage = aws_lambda.Code.fromEcrImage(ecrRepository, {
        tagOrDigest: props.environmentName,
      });

      const fargateServiceId = addPrefix(`Fargate${service}Service`, props);
      const fargateService =
        new cdk.aws_ecs_patterns.ApplicationLoadBalancedFargateService(
          this,
          fargateServiceId,
          {
            vpc: vpc,
            memoryLimitMiB: 1024,
            cpu: 256,
            taskImageOptions: {
              image:
                cdk.aws_ecs.ContainerImage.fromEcrRepository(ecrRepository), // TODO: Specify tag.
              environment: {
                bucketName: bucket.bucketName,
                bucketBaseUrl: bucket.bucketWebsiteUrl,
              },
            },
            publicLoadBalancer: true,
          }
        );

      const serviceApiLambdaName = addPrefix(`${service}-ApiLambda`, props);
      const serviceApiLambda = new aws_lambda.Function(
        this,
        serviceApiLambdaName,
        {
          code: aws_lambda.Code.fromAssetImage(
            `../dotnet-services/${service}/${service}Service.Api`
          ),
          functionName: serviceApiLambdaName,
          runtime: aws_lambda.Runtime.FROM_IMAGE,
          handler: aws_lambda.Handler.FROM_IMAGE,
          environment: {
            environment: props.environmentName,
          },
          logRetention: aws_logs.RetentionDays.ONE_DAY,
        }
      );
      const lambdaHttpApiServiceProxyPath = `/${service}Service/{proxy+}`;
      const lambdaHttpApiServiceRouteKey = `ANY ${lambdaHttpApiServiceProxyPath}`;
      const lambdaHttpApiArn = `arn:aws:execute-api:${this.region}:${this.account}:${lambdaHttpApi.attrApiId}/${props.environmentName}/*/userService/*`;
      console.log("lambdaHttpApiArn:", lambdaHttpApiArn);
      const apiLambdaGatewayPermissionId = `${serviceApiLambdaName}-gateway-permission`;
      const apiLambdaGatewayPermission = new aws_lambda.CfnPermission(
        this,
        apiLambdaGatewayPermissionId,
        {
          action: "lambda:InvokeFunction",
          functionName: serviceApiLambdaName,
          principal: "apigateway.amazonaws.com",
          sourceArn: lambdaHttpApiArn,
        }
      );

      const serviceApiLambdaIntegration = new aws_apigatewayv2.CfnIntegration(
        this,
        `${serviceApiLambdaName}-gw-integration`,
        {
          apiId: lambdaHttpApi.attrApiId,
          integrationType: "AWS_PROXY",
          payloadFormatVersion: "2.0",
          integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${serviceApiLambda.functionArn}/invocations`,
        }
      );
      new aws_apigatewayv2.CfnRoute(this, `${serviceApiLambdaName}Route`, {
        apiId: lambdaHttpApi.attrApiId,
        routeKey: lambdaHttpApiServiceRouteKey,
        target: `integrations/${serviceApiLambdaIntegration.ref}`,
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
