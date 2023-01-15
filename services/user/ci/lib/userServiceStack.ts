import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface Props extends cdk.StackProps {
  environmentName: string;
}

export class UserServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: Props) {
    super(scope, id, props);

    // TODO: Get lambda API from general regional stack.
    // TODO: Create lambda with code in ../app
    // TODO:
  }
}
