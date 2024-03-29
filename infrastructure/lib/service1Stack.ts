import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { addPrefix } from "./helpers";
import { ServiceStackProps } from "./types";

export class Service1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: ServiceStackProps) {
    super(scope, id, props);

    if (!props) {
      throw new Error("props not defined.");
    }

    if (!props.env || !props.env.account || !props.env.region) {
      throw new Error("props.env or its properties not defined.");
    }

    const buildNumberParameter = new cdk.CfnParameter(this, "buildNumber", {});

    const serviceName = "service1";
    const bucketName = addPrefix(`${serviceName}-data`, props);
    const bucket = new cdk.aws_s3.Bucket(this, bucketName, {
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      accessControl: cdk.aws_s3.BucketAccessControl.PRIVATE,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const environmentNamespaceArn = cdk.aws_ssm.StringParameter.valueFromLookup(
      this,
      "/iac/ecs/environmentNamespaceArn"
    );
    const environmentNamespaceId = cdk.aws_ssm.StringParameter.valueFromLookup(
      this,
      "/iac/ecs/environmentNamespaceId"
    );
    const environmentNamespaceName =
      cdk.aws_ssm.StringParameter.valueFromLookup(
        this,
        "/iac/ecs/environmentNamespaceName"
      );
    const environmentNamespace =
      cdk.aws_servicediscovery.PrivateDnsNamespace.fromPrivateDnsNamespaceAttributes(
        this,
        "EnvironmentNamespace",
        {
          namespaceArn: environmentNamespaceArn,
          namespaceId: environmentNamespaceId,
          namespaceName: environmentNamespaceName,
        }
      );

    const fargateServiceName = "fargate-service1";
    const logGroupId = addPrefix("Service1LogGroup", props);
    const serviceLogGroup = new cdk.aws_logs.LogGroup(this, logGroupId, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: cdk.aws_logs.RetentionDays.ONE_DAY,
      logGroupName: logGroupId,
    });
    const logDriver = new cdk.aws_ecs.AwsLogDriver({
      streamPrefix: fargateServiceName,
      logGroup: serviceLogGroup,
    });

    const serviceConnectLogGroupId = addPrefix(
      "Service1ServiceConnectLogGroup",
      props
    );
    const serviceConnectLogGroup = new cdk.aws_logs.LogGroup(
      this,
      serviceConnectLogGroupId,
      {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: cdk.aws_logs.RetentionDays.ONE_DAY,
        logGroupName: serviceConnectLogGroupId,
      }
    );
    const serviceConnectLogDriver = new cdk.aws_ecs.AwsLogDriver({
      streamPrefix: fargateServiceName,
      logGroup: serviceConnectLogGroup,
    });

    const taskDef = new cdk.aws_ecs.FargateTaskDefinition(
      this,
      "MyTaskDefinition",
      {
        memoryLimitMiB: 512,
        cpu: 256,
      }
    );

    taskDef.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const ecrRepository = cdk.aws_ecr.Repository.fromRepositoryArn(
      this,
      "service1Repository",
      "arn:aws:ecr:eu-west-1:715815605776:repository/service1"
    );
    const containerImage = cdk.aws_ecs.ContainerImage.fromEcrRepository(
      ecrRepository,
      buildNumberParameter.valueAsString
    );

    const containerDefinition = taskDef.addContainer("service1", {
      image: containerImage,
      logging: logDriver,
      environment: {
        EnvironmentName: props.environmentName,
        Service2BaseUrl: `http://service2`,
      },
    });

    const servicePortMappingName = "service1";
    containerDefinition.addPortMappings({
      name: servicePortMappingName,
      containerPort: 80,
      hostPort: 80,
    });

    const clusterNameParameterValue =
      cdk.aws_ssm.StringParameter.valueFromLookup(this, "/iac/ecs/clusterName");

    const clusterArnParameter =
      cdk.aws_ssm.StringParameter.fromStringParameterName(
        this,
        "clusterArnParameter",
        "/iac/ecs/clusterArn"
      );

    const vpcIdParameterValue = cdk.aws_ssm.StringParameter.valueFromLookup(
      this,
      "/iac/ecs/vpcId"
    );

    const vpc = cdk.aws_ec2.Vpc.fromLookup(this, addPrefix("vpc", props), {
      vpcId: vpcIdParameterValue,
    });

    const cluster = cdk.aws_ecs.Cluster.fromClusterAttributes(this, "cluster", {
      clusterName: clusterNameParameterValue,
      clusterArn: clusterArnParameter.stringValue,
      vpc,
      securityGroups: [],
    });

    const fargateServiceId = addPrefix("Service1", props);
    const fargateService = new cdk.aws_ecs.FargateService(
      this,
      fargateServiceId,
      {
        cluster: cluster,
        taskDefinition: taskDef,
        desiredCount: 2,
        serviceName: "service1",
        cloudMapOptions: {
          cloudMapNamespace: environmentNamespace,
          containerPort: 80,
        },
        serviceConnectConfiguration: {
          logDriver: serviceConnectLogDriver,
          namespace: environmentNamespaceArn,
          services: [
            {
              // dnsName: "service1",
              portMappingName: servicePortMappingName,
            },
          ],
        },
      }
    );
    const loadBalancerArn = cdk.aws_ssm.StringParameter.valueFromLookup(
      this,
      "/iac/ecs/alb"
    );

    const alb =
      cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer.fromLookup(
        this,
        "alb",
        {
          loadBalancerArn,
        }
      );

    const service1TargetGroup =
      new cdk.aws_elasticloadbalancingv2.ApplicationTargetGroup(
        this,
        "Service1TargetGroup",
        {
          targetType: cdk.aws_elasticloadbalancingv2.TargetType.IP,
          targets: [fargateService],
          vpc,
          protocol: cdk.aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
          healthCheck: {
            enabled: true,
            interval: cdk.Duration.seconds(10),
            timeout: cdk.Duration.seconds(5),
            path: "/health",
            //port: "80",
            protocol: cdk.aws_elasticloadbalancingv2.Protocol.HTTP,
          },
        }
      );

    const listenerArn = cdk.aws_ssm.StringParameter.valueFromLookup(
      this,
      "/iac/ecs/listenerArn"
    );

    const listener =
      cdk.aws_elasticloadbalancingv2.ApplicationListener.fromLookup(
        this,
        "ApplicationListener",
        {
          listenerArn,
        }
      );

    listener.addTargetGroups("serviceTargetGroup", {
      conditions: [
        cdk.aws_elasticloadbalancingv2.ListenerCondition.pathPatterns([
          "/service1/*",
        ]),
      ],
      priority: 1,
      targetGroups: [service1TargetGroup],
    });
  }
}
