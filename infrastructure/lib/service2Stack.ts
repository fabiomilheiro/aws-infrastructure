// import * as gw from "@aws-cdk/aws-apigateway";
// import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { addPrefix } from "./helpers";
import { ServiceStackProps } from "./types";

export class Service2Stack extends cdk.Stack {
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

    const ecrRepositoryParameter =
      cdk.aws_ssm.StringParameter.fromStringParameterName(
        this,
        "ecrRepositoryParameter",
        "/iac/ecr/service2Uri"
      );

    const clusterArnParameter =
      cdk.aws_ssm.StringParameter.fromStringParameterName(
        this,
        "clusterArnParameter",
        "/iac/ecs/clusterArn"
      );

    const cluster = cdk.aws_ecs.Cluster.fromClusterArn(
      this,
      "cluster",
      clusterArnParameter.stringValue
    );

    const fargateServiceName = "fargate-service2";
    new cdk.aws_ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      fargateServiceName,
      {
        cluster: cluster, // Required
        cpu: 256, // Default is 256
        desiredCount: 2, // Default is 1
        taskImageOptions: {
          image: cdk.aws_ecs.ContainerImage.fromRegistry(
            ecrRepositoryParameter.stringValue
          ),
        },
        memoryLimitMiB: 512, // Default is 512
        publicLoadBalancer: true, // Default is true
      }
    );
  }
}
