#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { GeneralRegionalStack } from "../lib/generalRegionalStack";

const app = new cdk.App();
const regionEuropeWest2 = "eu-west-2";
const regionUsWest1 = "us-east-1";
const regions = [regionEuropeWest2, regionUsWest1];

for (const region of regions) {
  const stackName = `General-Regional-${region}`;
  new GeneralRegionalStack(app, stackName, {
    environmentName: process.env.ENVIRONMENT_NAME,
    env: {
      account: process.env.AWS_ACCOUNT,
      region: region,
    },
    stackName,
    description: `Regional resources for ${region} e.g. S3, API Gateway, etc.`,
    /* If you don't specify 'env', this stack will be environment-agnostic.
     * Account/Region-dependent features and context lookups will not work,
     * but a single synthesized template can be deployed anywhere. */
    /* Uncomment the next line to specialize this stack for the AWS Account
     * and Region that are implied by the current CLI configuration. */
    // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    /* Uncomment the next line if you know exactly what Account and Region you
     * want to deploy the stack to. */
    // env: { account: '123456789012', region: 'us-east-1' },
    /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  });
}
