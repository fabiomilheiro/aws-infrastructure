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
    const fargateService =
      new cdk.aws_ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        fargateServiceName,
        {
          cluster: props.cluster, // Required
          cpu: 256, // Default is 256
          desiredCount: 2, // Default is 1
          taskImageOptions: {
            image: cdk.aws_ecs.ContainerImage.fromRegistry(
              props.ecrService1Repository.repositoryUri
            ),
          },
          memoryLimitMiB: 512, // Default is 512
          publicLoadBalancer: true, // Default is true
        }
      );
  }
}
