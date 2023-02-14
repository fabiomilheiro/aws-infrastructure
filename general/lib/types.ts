import * as cdk from "@aws-cdk/core";

export interface StackProps extends cdk.StackProps {
  readonly environmentName: EnvironmentName;
}

export enum EnvironmentName {
  Development = "dev",
  Production = "prod",
}

export const environmentValidator = createEnumParser(EnvironmentName);

export enum ServiceName {
  User = "user",
  Order = "order",
}

export const serviceNameValidator = createEnumParser(ServiceName);

export enum RegionName {
  EuropeWest1 = "eu-west-1",
  UsEast1 = "us-east-1",
}

export const regionNameValidator = createEnumParser(RegionName);

function createEnumParser<
  T extends string,
  TEnumValue extends string
>(enumVariable: { [key in T]: TEnumValue }) {
  const enumValues = Object.values(enumVariable);
  return {
    Parse: (value?: string): TEnumValue => {
      if (!enumValues.includes(value)) {
        throw new Error(
          `Invalid value: '${value}' It must be one of [${enumValues.join(
            ", "
          )}]`
        );
      }

      return value as TEnumValue;
    },
  };
}
