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
    const logging = new cdk.aws_ecs.AwsLogDriver({
      streamPrefix: "myapp",
    });

    const taskDef = new cdk.aws_ecs.FargateTaskDefinition(
      this,
      "MyTaskDefinition",
      {
        memoryLimitMiB: 512,
        cpu: 256,
      }
    );

    const ecrRepositoryUriParameter =
      cdk.aws_ssm.StringParameter.fromStringParameterName(
        this,
        "ecrRepositoryParameter",
        "/iac/ecr/service1Uri"
      );

    const vpcIdParameterValue = cdk.aws_ssm.StringParameter.valueFromLookup(
      this,
      "/iac/ecs/vpcId"
    );

    const clusterNameParameterValue =
      cdk.aws_ssm.StringParameter.valueFromLookup(this, "/iac/ecs/clusterName");

    const clusterArnParameter =
      cdk.aws_ssm.StringParameter.fromStringParameterName(
        this,
        "clusterArnParameter",
        "/iac/ecs/clusterArn"
      );

    const cluster = cdk.aws_ecs.Cluster.fromClusterAttributes(this, "cluster", {
      clusterName: clusterNameParameterValue,
      clusterArn: clusterArnParameter.stringValue,
      vpc: cdk.aws_ec2.Vpc.fromLookup(this, "vpc", {
        vpcId: vpcIdParameterValue,
      }),
      securityGroups: [],
    });

    taskDef.addContainer("AppContainer", {
      image: cdk.aws_ecs.ContainerImage.fromRegistry(
        ecrRepositoryUriParameter.stringValue
      ),
      logging,
    });

    // Instantiate ECS Service with just cluster and image
    new cdk.aws_ecs.FargateService(this, "FargateService1", {
      cluster: cluster,
      taskDefinition: taskDef,
    });
    // const fargateService =
    //   new cdk.aws_ecs_patterns.ApplicationLoadBalancedFargateService(
    //     this,
    //     fargateServiceName,
    //     {
    //       cluster: props.cluster, // Required
    //       cpu: 256, // Default is 256
    //       desiredCount: 2, // Default is 1
    //       taskImageOptions: {
    //         image: cdk.aws_ecs.ContainerImage.fromRegistry(
    //           "amazon/amazon-ecs-sample" // props.ecrService1Repository.repositoryUri
    //         ),
    //       },
    //       memoryLimitMiB: 512, // Default is 512
    //       publicLoadBalancer: true, // Default is true
    //     }
    //   );
  }
}
