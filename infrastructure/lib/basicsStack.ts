// import * as gw from "@aws-cdk/aws-apigateway";
// import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { addPrefix } from "./helpers";
import { ServiceName, StackProps } from "./types";

const services: ServiceName[] = [ServiceName.User];

export class BasicStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    if (!props) {
      throw new Error("props not defined.");
    }

    if (!props.env || !props.env.account || !props.env.region) {
      throw new Error("props.env or its properties not defined.");
    }

    const ecrService1RepositoryName = addPrefix("ecr", props);
    const ecrService1Repository = new cdk.aws_ecr.Repository(
      this,
      ecrService1RepositoryName,
      {
        encryption: cdk.aws_ecr.RepositoryEncryption.KMS,
        repositoryName: ecrService1RepositoryName,
      }
    );

    const ecrService2RepositoryName = addPrefix("ecr", props);
    const ecrService2Repository = new cdk.aws_ecr.Repository(
      this,
      ecrService2RepositoryName,
      {
        encryption: cdk.aws_ecr.RepositoryEncryption.KMS,
        repositoryName: ecrService2RepositoryName,
      }
    );

    const vpcId = addPrefix("vpc", props);
    const vpc = new cdk.aws_ec2.Vpc(this, vpcId, {});

    new cdk.CfnOutput(this, "VPC", {
      value: vpc.vpcId,
    });
  }
}
