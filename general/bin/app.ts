#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import "source-map-support/register";
import { GeneralRegionalStack } from "../lib/generalRegionalStack";
import { GlobalStack } from "../lib/globalStack";
import {
  EnvironmentName,
  environmentValidator,
  RegionName,
  StackProps,
} from "../lib/types";

const environmentRegions: Record<EnvironmentName, RegionName[]> = {
  dev: [RegionName.EuropeWest1],
  prod: [RegionName.EuropeWest1],
};

const app = new cdk.App();

const environmentName = environmentValidator.Parse(
  process.env.ENVIRONMENT_NAME
);

const account = process.env.AWS_ACCOUNT;
if (!account) {
  throw new Error("AWS_ACCOUNT environment variable not defined.");
}

const regions = environmentRegions[environmentName];
const defaultProps: StackProps = {
  environmentName: environmentName,
  env: {
    account: account,
  },
};

const globalStackName = "Global";
new GlobalStack(app, globalStackName, {
  ...defaultProps,
  env: {
    ...defaultProps.env,
    region: RegionName.EuropeWest1,
  },
  stackName: globalStackName,
  description: "Global resources e.g. ECR, etc.",
});

regions.forEach((region) => {
  const generalStackName = `General-Regional-${region}`;
  new GeneralRegionalStack(app, generalStackName, {
    ...defaultProps,
    env: {
      account: account,
      region: region,
    },
    stackName: generalStackName,
    description: `Regional resources for ${region} e.g. S3, API Gateway, etc.`,
  });
});
