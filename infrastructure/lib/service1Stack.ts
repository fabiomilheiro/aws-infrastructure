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

    const buildNumberParameter = new cdk.CfnParameter(
      this,
      "BuilderNumberParameter",
      {}
    );

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
      logGroupName: "Service1",
    });
    const logDriver = new cdk.aws_ecs.AwsLogDriver({
      streamPrefix: fargateServiceName,
      logGroup: serviceLogGroup,
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

    const containerDefinition = taskDef.addContainer("AppContainer", {
      image: containerImage,
      logging: logDriver,
      environment: {
        EnvironmentName: props.environmentName,
        Service2BaseUrl: `service2.${environmentNamespace.namespaceName}`,
      },
    });

    containerDefinition.addPortMappings({
      containerPort: 80,
      hostPort: 80,
    });

    containerDefinition.addEnvironment(
      "ENVIRONMENT_NAME",
      props.environmentName
    );
    containerDefinition.addEnvironment("EXAMPLE_ENV_VAR", "1000");

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
        serviceName: "Service1",
        securityGroups: [],
        cloudMapOptions: {
          cloudMapNamespace: environmentNamespace,
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

    const listener = alb.addListener("Service1Listener", {
      port: 80,
    });

    listener.addTargets("serviceTargets", {
      healthCheck: {
        path: "/health",
        enabled: true,
      },
    });

    // fargateService.configureHealthCheck({
    //   path: "/health",
    // });

    // const ecrRepositoryUriParameter =
    //   cdk.aws_ssm.StringParameter.fromStringParameterName(
    //     this,
    //     "ecrRepositoryParameter",
    //     "/iac/ecr/service1Uri"
    //   );

    // const vpcIdParameterValue = cdk.aws_ssm.StringParameter.valueFromLookup(
    //   this,
    //   "/iac/ecs/vpcId"
    // );

    // const clusterNameParameterValue =
    //   cdk.aws_ssm.StringParameter.valueFromLookup(this, "/iac/ecs/clusterName");

    // const clusterArnParameter =
    //   cdk.aws_ssm.StringParameter.fromStringParameterName(
    //     this,
    //     "clusterArnParameter",
    //     "/iac/ecs/clusterArn"
    //   );

    // const cluster = cdk.aws_ecs.Cluster.fromClusterAttributes(this, "cluster", {
    //   clusterName: clusterNameParameterValue,
    //   clusterArn: clusterArnParameter.stringValue,
    //   vpc: cdk.aws_ec2.Vpc.fromLookup(this, "vpc", {
    //     vpcId: vpcIdParameterValue,
    //   }),
    //   securityGroups: [],
    // });

    // Instantiate ECS Service with just cluster and image
    // new cdk.aws_ecs.FargateService(this, "FargateService1", {
    //   cluster: cluster,
    //   taskDefinition: taskDef,
    // });
    // const fargateService =
    //   new cdk.aws_ecs_patterns.ApplicationLoadBalancedFargateService(
    //     this,
    //     fargateServiceName,
    //     {
    //       //cluster: cluster, // Required
    //       cpu: 256, // Default is 256
    //       desiredCount: 2, // Default is 1
    //       taskImageOptions: {
    //         image: cdk.aws_ecs.ContainerImage.fromEcrRepository(
    //           ecrRepository,
    //           "latest"
    //         ),
    //         containerPort: 80,
    //         environment: {
    //           test: "test env var",
    //         },
    //         logDriver: logDriver,
    //       },
    //       listenerPort: 80,
    //       memoryLimitMiB: 512, // Default is 512
    //       publicLoadBalancer: true, // Default is true
    //     }
    //   );

    // fargateService.targetGroup.configureHealthCheck({
    //   path: "/health",
    // });
  }
}
