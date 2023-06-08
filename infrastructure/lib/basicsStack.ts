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
    const ecrService1Repository = new cdk.aws_ecr.Repository(
      this,
      ecrService1RepositoryName,
      {
        encryption: cdk.aws_ecr.RepositoryEncryption.KMS,
        repositoryName: ecrService1RepositoryName,
      }
    );

    const ecrService1ParameterId = "/iac/ecr/service1Uri";
    new cdk.aws_ssm.StringParameter(this, ecrService1ParameterId, {
      parameterName: ecrService1ParameterId,
      stringValue: ecrService1Repository.repositoryUri,
    });

    const ecrService2RepositoryName = "service2";
    const ecrService2Repository = new cdk.aws_ecr.Repository(
      this,
      ecrService2RepositoryName,
      {
        encryption: cdk.aws_ecr.RepositoryEncryption.KMS,
        repositoryName: ecrService2RepositoryName,
      }
    );

    const ecrService2ParameterId = "/iac/ecr/service2Uri";
    new cdk.aws_ssm.StringParameter(this, ecrService2ParameterId, {
      parameterName: ecrService2ParameterId,
      stringValue: ecrService2Repository.repositoryUri,
    });

    const vpcId = addPrefix("vpc", props);
    const vpc = new cdk.aws_ec2.Vpc(this, vpcId, {
      maxAzs: 2,
    });

    const clusterId = addPrefix("cluster", props);
    this.cluster = new cdk.aws_ecs.Cluster(this, clusterId, {
      vpc: vpc,
      clusterName: clusterId,
      enableFargateCapacityProviders: true,
    });

    new cdk.aws_ssm.StringParameter(this, "VpcIdParameter", {
      parameterName: "/iac/ecs/vpcId",
      stringValue: vpc.vpcId,
    });

    new cdk.aws_ssm.StringParameter(this, "clusterNameParameter", {
      parameterName: "/iac/ecs/clusterName",
      stringValue: this.cluster.clusterName,
    });

    const clusterArnParameterId = "/iac/ecs/clusterArn";
    new cdk.aws_ssm.StringParameter(this, clusterArnParameterId, {
      parameterName: clusterArnParameterId,
      stringValue: this.cluster.clusterArn,
    });

    new cdk.CfnOutput(this, "VPC", {
      value: vpc.vpcId,
    });

    new cdk.CfnOutput(this, "Cluster", {
      value: this.cluster.clusterName,
    });
  }
}
