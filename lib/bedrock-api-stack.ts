import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { Construct } from 'constructs';
import * as path from 'path';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';

export class BedrockApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create CodeBuild project
    const buildProject = new codebuild.Project(this, 'BedrockApiBuild', {
      projectName: 'bedrock-api-build',
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
        computeType: codebuild.ComputeType.SMALL,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '22'
            },
            commands: ['npm ci']
          },
          build: {
            commands: [
              'npm run build',
              'npm run test'
            ]
          },
          post_build: {
            commands: ['npm run cdk synth']
          }
        },
        artifacts: {
          files: [
            'cdk.out/**/*',
            'package.json',
            'package-lock.json',
            'node_modules/**/*'
          ],
          'discard-paths': 'no'
        },
        cache: {
          paths: [
            'node_modules/**/*',
            '.npm/**/*'
          ]
        }
      }),
    });

    // Add necessary permissions to the build project
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        resources: ['*']
      })
    );

    const handler = new lambdaNodejs.NodejsFunction(this, 'BedrockHandler', {
      entry: path.join(__dirname, '../lambda/bedrock-handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
      },
    });

    cdk.Tags.of(handler).add('bedrock-learning', 'true');

    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'], // optionally narrow down to specific models
      })
    );

    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        resources: ['*']
      })
    );

    const api = new apigateway.LambdaRestApi(this, 'BedrockAPI', {
      handler: handler,
      proxy: false,
    });

    cdk.Tags.of(api).add('bedrock-learning', 'true');

    const items = api.root.addResource('chat');
    items.addMethod('POST'); // POST /chat
  }
}
