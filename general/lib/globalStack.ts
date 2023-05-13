import * as cdk from "@aws-cdk/core";
import { StackProps } from "./types";

export class GlobalStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    if (!props) {
      throw new Error("props not defined.");
    }

    if (!props.env || !props.env.account || !props.env.region) {
      throw new Error("props.env or its properties not defined.");
    }

    // const ecrRepositoryName = addPrefix("ecr", props);
    // const ecrRepository = new ecr.Repository(this, ecrRepositoryName, {
    //   encryption: ecr.RepositoryEncryption.KMS,
    //   repositoryName: ecrRepositoryName,
    // });
  }
}
