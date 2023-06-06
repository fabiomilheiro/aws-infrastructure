// import * as gw from "@aws-cdk/aws-apigateway";
// import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { addPrefix } from "./helpers";
import { ServiceName, StackProps } from "./types";

const services: ServiceName[] = [ServiceName.User];

export class Service1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
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
  }
}
