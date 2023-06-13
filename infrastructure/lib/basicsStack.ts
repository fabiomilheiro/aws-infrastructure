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

    // const ecrService1RepositoryName = "service1";
    // const ecrService1Repository = new cdk.aws_ecr.Repository(
    //   this,
    //   ecrService1RepositoryName,
    //   {
    //     encryption: cdk.aws_ecr.RepositoryEncryption.KMS,
    //     repositoryName: ecrService1RepositoryName,
    //   }
    // );

    // const ecrService1ParameterId = "/iac/ecr/service1Uri";
    // new cdk.aws_ssm.StringParameter(this, ecrService1ParameterId, {
    //   parameterName: ecrService1ParameterId,
    //   stringValue: ecrService1Repository.repositoryUri,
    // });

    // const ecrService2RepositoryName = "service2";
    // const ecrService2Repository = new cdk.aws_ecr.Repository(
    //   this,
    //   ecrService2RepositoryName,
    //   {
    //     encryption: cdk.aws_ecr.RepositoryEncryption.KMS,
    //     repositoryName: ecrService2RepositoryName,
    //   }
    // );

    // const ecrService2ParameterId = "/iac/ecr/service2Uri";
    // new cdk.aws_ssm.StringParameter(this, ecrService2ParameterId, {
    //   parameterName: ecrService2ParameterId,
    //   stringValue: ecrService2Repository.repositoryUri,
    // });

    const vpcId = addPrefix("vpc", props);
    console.log("***VPC: ", vpcId);
    const vpc = new cdk.aws_ec2.Vpc(this, vpcId, {
      maxAzs: 2,
      vpcName: vpcId,
    });

    const clusterId = addPrefix("cluster", props);
    this.cluster = new cdk.aws_ecs.Cluster(this, clusterId, {
      vpc: vpc,
      clusterName: clusterId,
      enableFargateCapacityProviders: true,
    });

    const alb = new cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer(
      this,
      "ALB",
      {
        vpc: vpc,
        internetFacing: true,
        loadBalancerName: "ServicesLB",
      }
    );

    const environmentNamespaceId = addPrefix("EnvironmentNamespace", props);
    const environmentNamespace =
      new cdk.aws_servicediscovery.PrivateDnsNamespace(
        this,
        environmentNamespaceId,
        {
          name: `props.environmentName`,
          vpc: vpc,
        }
      );

    new cdk.aws_ssm.StringParameter(this, "EnvironmentNamespaceArn", {
      parameterName: "/iac/ecs/environmentNamespaceArn",
      stringValue: environmentNamespace.namespaceArn,
    });

    new cdk.aws_ssm.StringParameter(this, "EnvironmentNamespaceId", {
      parameterName: "/iac/ecs/environmentNamespaceId",
      stringValue: environmentNamespace.namespaceId,
    });

    new cdk.aws_ssm.StringParameter(this, "EnvironmentNamespaceName", {
      parameterName: "/iac/ecs/environmentNamespaceName",
      stringValue: environmentNamespace.namespaceName,
    });
    // const capacityProvider = new cdk.aws_ecs.AsgCapacityProvider(
    //   this,
    //   "CapacityProvider",
    //   {
    //     autoScalingGroup: new cdk.aws_autoscaling.AutoScalingGroup(
    //       this,
    //       "autoscaling",
    //       {
    //         vpc,
    //         allowAllOutbound: true,
    //       }
    //     ),
    //   }
    // );
    // this.cluster.addAsgCapacityProvider(capacityProvider);

    // const defaultCapacityProviderStrategy: cdk.aws_ecs.CapacityProviderStrategy[] =
    //   [
    //     {
    //       capacityProvider: "FARGATE_SPOT",
    //       base: 10,
    //       weight: 50,
    //     },
    //   ];
    // this.cluster.addDefaultCapacityProviderStrategy(
    //   defaultCapacityProviderStrategy
    // );

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

    const loadBalanceArnParameterId = "/iac/ecs/alb";
    new cdk.aws_ssm.StringParameter(this, loadBalanceArnParameterId, {
      parameterName: loadBalanceArnParameterId,
      stringValue: alb.loadBalancerArn,
    });

    new cdk.CfnOutput(this, "VPC", {
      value: vpc.vpcId,
    });

    new cdk.CfnOutput(this, "Cluster", {
      value: this.cluster.clusterName,
    });
  }
}
