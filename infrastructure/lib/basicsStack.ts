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

    const vpcId = addPrefix("vpc", props);
    const vpc = new cdk.aws_ec2.Vpc(this, vpcId, {
      maxAzs: 1,
      vpcName: vpcId,
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

    const listener = alb.addListener("ServiceListener", {
      port: 80,
      protocol: cdk.aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
      defaultAction:
        cdk.aws_elasticloadbalancingv2.ListenerAction.fixedResponse(404, {
          messageBody: "not found",
        }),
    });

    const listenerArnParameterId = "/iac/ecs/listenerArn";
    new cdk.aws_ssm.StringParameter(this, listenerArnParameterId, {
      parameterName: listenerArnParameterId,
      stringValue: listener.listenerArn,
    });

    const clusterId = addPrefix("cluster", props);
    this.cluster = new cdk.aws_ecs.Cluster(this, clusterId, {
      vpc: vpc,
      clusterName: clusterId,
      enableFargateCapacityProviders: true,
    });
    const environmentNamespace = this.cluster.addDefaultCloudMapNamespace({
      name: props.environmentName,
      useForServiceConnect: true,
      vpc,
      type: cdk.aws_servicediscovery.NamespaceType.DNS_PRIVATE,
    });

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
