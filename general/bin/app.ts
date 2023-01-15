#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { GeneralRegionalStack } from "../lib/generalRegionalStack";
import {
  EnvironmentName,
  environmentValidator,
  RegionName,
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

regions.forEach((region) => {
  const stackName = `General-Regional-${region}`;
  new GeneralRegionalStack(app, stackName, {
    environmentName: environmentName,
    env: {
      account: account,
      region: region,
    },
    stackName,
    description: `Regional resources for ${region} e.g. S3, API Gateway, etc.`,
  });
});
