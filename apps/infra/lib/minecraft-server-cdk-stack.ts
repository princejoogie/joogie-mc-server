import {
  Stack,
  StackProps,
  Tags,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_iam as iam,
  aws_efs as efs,
  aws_logs as logs,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class MinecraftServerCdkStack extends Stack {
  private name: string;
  private vpc: ec2.IVpc;
  private efsSG: ec2.SecurityGroup;
  private minecraftSG: ec2.SecurityGroup;
  private mcRconSG: ec2.SecurityGroup;
  private sshSG: ec2.SecurityGroup;
  private efsAccessSG: ec2.SecurityGroup;
  private cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    this.name = props?.stackName ?? "mcscdk";
    this.vpc = new ec2.Vpc(this, `${this.name}-vpc`);
    this.initSecurityGroups();
    this.initBotGroup();

    this.cluster = new ecs.Cluster(this, `${this.name}-cluster`, {
      vpc: this.vpc,
    });

    this.createService(this.name, "1234567890", "princejoogie", "FORGE");
  }

  initSecurityGroups = () => {
    this.efsSG = new ec2.SecurityGroup(this, "efs-sg", {
      vpc: this.vpc,
      description: "EFS Security Group",
    });

    this.minecraftSG = this.efsSecGroup("minecraft", 25565);
    this.mcRconSG = this.efsSecGroup("mcrcon", 25575);
    this.sshSG = this.efsSecGroup("ssh", 22);
    this.efsAccessSG = this.efsSecGroup("efsAccess", 2049);
  };

  efsSecGroup = (name: string, port: number) => {
    const secGroup = new ec2.SecurityGroup(this, `${name}-sg`, {
      vpc: this.vpc,
      allowAllOutbound: true,
      description: `${name}-sg`,
    });

    secGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(port),
      `${name} from anywhere`
    );

    secGroup.addIngressRule(
      this.efsSG,
      ec2.Port.tcp(2049),
      `Allow efs access for ${name}`
    );

    this.efsSG.addIngressRule(
      secGroup,
      ec2.Port.tcp(2049),
      `Allow clients from ${name}`
    );

    return secGroup;
  };

  initBotGroup = () => {
    const statement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
    });

    statement.addActions(
      "ecs:ListClusters",
      "ecs:ListServices",
      "ecs:DescribeServices",
      "ecs:ListTasks",
      "ecs:DescribeTasks",
      "ecs:UpdateService",
      "ec2:DescribeNetworkInterfaces"
    );

    statement.addAllResources();

    const group = new iam.Group(this, `${this.name}-group`);
    group.addManagedPolicy(
      new iam.ManagedPolicy(this, `${this.name}-start-stop-policy`, {
        statements: [statement],
      })
    );

    return group;
  };

  createService = (
    name: string,
    guild: string,
    operators: string,
    type: string
  ) => {
    const service = new ecs.FargateService(this, `${name}-service`, {
      cluster: this.cluster,
      taskDefinition: this.createTask(name, guild, operators, type),
      assignPublicIp: true,
      desiredCount: 1,
      securityGroups: [
        this.minecraftSG,
        this.mcRconSG,
        this.sshSG,
        this.efsAccessSG,
      ],
      propagateTags: ecs.PropagatedTagSource.SERVICE,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
    });

    Tags.of(service).add("guild", guild);
    return service;
  };

  createTask = (
    name: string,
    guild: string,
    operators: string,
    type: string
  ) => {
    const volume = this.createEfsVolume(name);
    const task = new ecs.FargateTaskDefinition(
      this,
      `${name}-task-definition`,
      {
        cpu: 1024,
        memoryLimitMiB: 4096,
        volumes: [volume],
      }
    );

    Tags.of(task).add("guild", guild);
    this.createContainer(name, task, operators, volume, type);
    return task;
  };

  createEfsVolume = (name: string) => {
    const fs = new efs.FileSystem(this, `${name}-fs`, {
      vpc: this.vpc,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
      securityGroup: this.efsSG,
    });

    fs.addAccessPoint(name, { path: "/" });
    const volume: ecs.Volume = {
      name: `${name}-volume`,
      efsVolumeConfiguration: {
        fileSystemId: fs.fileSystemId,
      },
    };

    return volume;
  };

  createContainer = (
    name: string,
    task: ecs.FargateTaskDefinition,
    operators: string,
    volume: ecs.Volume,
    type: string
  ) => {
    const container = task.addContainer(name, {
      /* image: ecs.ContainerImage.fromRegistry("itzg/minecraft-server"), */
      image: ecs.ContainerImage.fromRegistry("princejoogie/minecraft-server"),
      essential: true,
      environment: {
        EULA: "TRUE",
        OPS: operators,
        VERSION: "1.18.2",
        SERVER_NAME: "joogie",
        MOTD: "joogie's server for degens",
        ONLINE_MODE: "false",
        ALLOW_NETHER: "true",
        ALLOW_CHEATS: "true",
        ENABLE_COMMAND_BLOCK: "true",
        ENABLE_RCON: "true",
        MAX_TICK_TIME: "60000",
        MAX_MEMORY: "3600M",
        MEMORY: "3584M",
        MAX_PLAYERS: "50",
        TYPE: type,
        MODPACK:
          "https://github.com/princejoogie/joogie-mc-server/raw/main/apps/docker/modpacks/joogie2.zip",
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: name,
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    container.addPortMappings({ containerPort: 25565 });
    container.addPortMappings({ containerPort: 25575 });

    container.addMountPoints({
      containerPath: "/data",
      sourceVolume: volume.name,
      readOnly: false,
    });

    return container;
  };
}
