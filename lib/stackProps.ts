import * as cdk from "aws-cdk-lib";

export interface StackProps extends cdk.StackProps {
  readonly environmentName?: string;
}
