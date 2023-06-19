import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { BasicsStack } from "../lib/basicsStack";
import { Service1Stack } from "../lib/service1Stack";
import { Service2Stack } from "../lib/service2Stack";
import {
  EnvironmentName,
  environmentValidator,
  RegionName,
  StackProps,
} from "../lib/types";

const environmentRegions: Record<EnvironmentName, RegionName> = {
  dev: RegionName.EuropeWest1,
  prod: RegionName.EuropeWest1,
};

const app = new cdk.App();

const environmentName = environmentValidator.Parse(
  process.env.ENVIRONMENT_NAME
);

const account = process.env.AWS_ACCOUNT;
if (!account) {
  throw new Error("AWS_ACCOUNT environment variable not defined.");
}

const defaultProps: StackProps = {
  environmentName: environmentName,
  env: {
    account: account,
  },
};

const region = environmentRegions[environmentName];
const generalStackName = `${region}-basics`;
const basicsStack = new BasicsStack(app, generalStackName, {
  ...defaultProps,
  env: {
    account: account,
    region: region,
  },
  stackName: generalStackName,
  description: `Basic resources.`,
});

const service1StackName = `${region}-service1`;
new Service1Stack(app, service1StackName, {
  ...defaultProps,
  env: {
    account: account,
    region: region,
  },
  stackName: service1StackName,
  description: `Service 1 resources.`,
});

const service2StackName = `${region}-service2`;
new Service2Stack(app, service2StackName, {
  ...defaultProps,
  env: {
    account: account,
    region: region,
  },
  stackName: service2StackName,
  description: `Service 2 resources.`,
});
