// import * as gw from "@aws-cdk/aws-apigateway";
// import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { addPrefix } from "./helpers";
import { ServiceName, ServiceStackProps } from "./types";

const services: ServiceName[] = [ServiceName.User];

export class Service1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: ServiceStackProps) {
    super(scope, id, props);

    if (!props) {
      throw new Error("props not defined.");
    }

    if (!props.env || !props.env.account || !props.env.region) {
      throw new Error("props.env or its properties not defined.");
    }

    const serviceName = "service1";
    const bucketName = addPrefix(`${serviceName}-data`, props);
    const bucket = new cdk.aws_s3.Bucket(this, bucketName, {
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      accessControl: cdk.aws_s3.BucketAccessControl.PRIVATE,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const fargateServiceName = "fargate-service1";
    const logGroupId = addPrefix("Service1LogGroup", props);
    const serviceLogGroup = new cdk.aws_logs.LogGroup(this, logGroupId, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: cdk.aws_logs.RetentionDays.ONE_DAY,
      logGroupName: "Service1",
    });
    const logDriver = new cdk.aws_ecs.AwsLogDriver({
      streamPrefix: fargateServiceName,
      logGroup: serviceLogGroup,
    });

    // const taskDef = new cdk.aws_ecs.FargateTaskDefinition(
    //   this,
    //   "MyTaskDefinition",
    //   {
    //     memoryLimitMiB: 512,
    //     cpu: 256,
    //   }
    // );

    // taskDef.addContainer("AppContainer", {
    //   image: cdk.aws_ecs.ContainerImage.fromRegistry(
    //     "715815605776.dkr.ecr.eu-west-1.amazonaws.com/service1:latest"
    //   ),
    //   logging,
    // });

    // const ecrRepositoryUriParameter =
    //   cdk.aws_ssm.StringParameter.fromStringParameterName(
    //     this,
    //     "ecrRepositoryParameter",
    //     "/iac/ecr/service1Uri"
    //   );

    // const vpcIdParameterValue = cdk.aws_ssm.StringParameter.valueFromLookup(
    //   this,
    //   "/iac/ecs/vpcId"
    // );

    // const clusterNameParameterValue =
    //   cdk.aws_ssm.StringParameter.valueFromLookup(this, "/iac/ecs/clusterName");

    // const clusterArnParameter =
    //   cdk.aws_ssm.StringParameter.fromStringParameterName(
    //     this,
    //     "clusterArnParameter",
    //     "/iac/ecs/clusterArn"
    //   );

    // const cluster = cdk.aws_ecs.Cluster.fromClusterAttributes(this, "cluster", {
    //   clusterName: clusterNameParameterValue,
    //   clusterArn: clusterArnParameter.stringValue,
    //   vpc: cdk.aws_ec2.Vpc.fromLookup(this, "vpc", {
    //     vpcId: vpcIdParameterValue,
    //   }),
    //   securityGroups: [],
    // });

    // Instantiate ECS Service with just cluster and image
    // new cdk.aws_ecs.FargateService(this, "FargateService1", {
    //   cluster: cluster,
    //   taskDefinition: taskDef,
    // });

    const ecrRepository = cdk.aws_ecr.Repository.fromRepositoryArn(
      this,
      "service1Repository",
      "arn:aws:ecr:eu-west-1:715815605776:repository/service1"
    );
    const fargateService =
      new cdk.aws_ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        fargateServiceName,
        {
          //cluster: cluster, // Required
          cpu: 256, // Default is 256
          desiredCount: 2, // Default is 1
          taskImageOptions: {
            image: cdk.aws_ecs.ContainerImage.fromEcrRepository(
              ecrRepository,
              "latest"
            ),
            containerPort: 80,
            environment: {
              test: "test env var",
            },
            logDriver: logDriver,
          },
          listenerPort: 80,
          memoryLimitMiB: 512, // Default is 512
          publicLoadBalancer: true, // Default is true
        }
      );

    fargateService.targetGroup.configureHealthCheck({
      path: "/health",
    });
  }
}
