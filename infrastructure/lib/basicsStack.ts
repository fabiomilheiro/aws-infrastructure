// import * as gw from "@aws-cdk/aws-apigateway";
// import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { addPrefix } from "./helpers";
import { ServiceName, StackProps } from "./types";

const services: ServiceName[] = [ServiceName.User];

export class BasicsStack extends cdk.Stack {
  public readonly cluster: cdk.aws_ecs.Cluster;
  public readonly ecrService1Repository: cdk.aws_ecr.Repository;
  public readonly ecrService2Repository: cdk.aws_ecr.Repository;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    if (!props) {
      throw new Error("props not defined.");
    }

    if (!props.env || !props.env.account || !props.env.region) {
      throw new Error("props.env or its properties not defined.");
    }

    const ecrService1RepositoryName = "service1";
    this.ecrService1Repository = new cdk.aws_ecr.Repository(
      this,
      ecrService1RepositoryName,
      {
        encryption: cdk.aws_ecr.RepositoryEncryption.KMS,
        repositoryName: ecrService1RepositoryName,
      }
    );

    const ecrService2RepositoryName = "service2";
    this.ecrService2Repository = new cdk.aws_ecr.Repository(
      this,
      ecrService2RepositoryName,
      {
        encryption: cdk.aws_ecr.RepositoryEncryption.KMS,
        repositoryName: ecrService2RepositoryName,
      }
    );

    const vpcId = addPrefix("vpc", props);
    const vpc = new cdk.aws_ec2.Vpc(this, vpcId, {});

    const clusterId = addPrefix("cluster", props);
    this.cluster = new cdk.aws_ecs.Cluster(this, clusterId, {
      vpc: vpc,
      clusterName: clusterId,
      enableFargateCapacityProviders: true,
    });

    new cdk.CfnOutput(this, "VPC", {
      value: vpc.vpcId,
    });

    new cdk.CfnOutput(this, "Cluster", {
      value: this.cluster.clusterName,
    });
  }
}
