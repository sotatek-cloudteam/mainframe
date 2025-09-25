# CardDemo Tutorial — Set up in AWS Mainframe Modernization Application Testing

This guide describes how to set up the CardDemo sample application for replatforming with Micro Focus on AWS Mainframe Modernization managed service, including use with AWS Mainframe Modernization Application Testing. The sample AWS CloudFormation template provisions a database, a runtime environment, an application, and a fully isolated network environment.

**Note**: The template creates AWS resources that may incur costs.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Folder Structure](#folder-structure)
3. [Step 1: Prepare to set up CardDemo](#step-1-prepare-to-set-up-carddemo-using-local-sources)
4. [Step 2: Create all necessary resources](#step-2-create-all-necessary-resources)
5. [Automation](#automation)
6. [M2 Application Definition](#m2-application-definition)
7. [Step 3: Deploy and start the application](#step-3-deploy-and-start-the-application)
8. [Step 4: Import initial data](#step-4-import-initial-data)
9. [Step 5: Connect to the CardDemo application](#step-5-connect-to-the-carddemo-application)

## Folder Structure

```
labs/2.CardDemo/
├── README.md                          # This documentation
├── Makefile                           # Deployment automation
├── scripts/
│   └── deploy_carddemo.sh             # Main deployment script
└── source/                            # CardDemo application source code
    ├── IC3-card-demo/
    │   ├── aws-m2-math-mf-carddemo.yaml    # CloudFormation template
    │   └── mf-carddemo-datasets-import.json # Dataset import configuration
    ├── catalog/                       # Mainframe catalog files
    │   ├── ctl/                       # Control files
    │   ├── data/                      # VSAM datasets and data files
    │   ├── jcl/                       # Job Control Language files
    │   └── proc/                      # Procedure files
    ├── loadlib/                       # Load library (compiled programs)
    ├── rdef/                          # Resource definitions
    └── xa/                           # XA resource adapters
```

### Prerequisites

- **Command-line tools**: `bash`, `make`, `g++` (or `clang++`), `unzip`, `sed`, `mktemp`
- **AWS CLI v2**: Installed and configured (`aws configure`). Set a default region or pass `AWS_REGION` when running.
- **AWS credentials/permissions** (role or user) allowing:
  - **S3**: `CreateBucket`, `PutObject`, `GetObject`, `ListBucket`
  - **CloudFormation**: `CreateStack`, `UpdateStack`, `DeleteStack`, `Describe*`
  - **IAM**: `PassRole`, `CreateRole`, `PutRolePolicy` (template uses `CAPABILITY_NAMED_IAM`)
  - **Mainframe Modernization (M2)**: full access to create environment and application
  - **RDS (Aurora PostgreSQL 15)**: create cluster/instance, subnet group, parameter group
  - **Secrets Manager**: create secret and target attachment
  - **KMS**: create key and allow decrypt by M2 service
  - **EC2**: security groups and use of existing VPC/subnets
  - **SSM Parameter Store**: create parameters
- **Network**: Existing `VPC` and two `Subnet` IDs (same VPC) you can pass to the script via `VPC_ID`, `SUBNET1_ID`, `SUBNET2_ID` (or use the provided defaults if valid in your account).
- **S3 uploads are automated**: You do not need to pre-create or manually upload to an S3 bucket. The deploy script creates/reuses a bucket and syncs all required artifacts for you.

### Step 1: Prepare to set up CardDemo (using local sources)

Upload and deployment can be handled end-to-end by the Makefile/script. The manual steps below are optional if you prefer doing it yourself.

Upload the CardDemo sample files and edit the AWS CloudFormation template that will create the CardDemo application.

If you've already downloaded and unzipped the sources in this repo (under `labs/2.CardDemo/source`), you can upload them directly to S3 and deploy.

Manual (optional):

1. Upload the unzipped `datasets_Mainframe_ebcdic` and `IC3-card-demo` folders to your S3 bucket.
2. Download the `aws-m2-math-mf-carddemo.yaml` AWS CloudFormation template from your bucket (`IC3-card-demo` folder) or use the one in this repo at `labs/2.CardDemo/source/IC3-card-demo/aws-m2-math-mf-carddemo.yaml`.
3. Edit `aws-m2-math-mf-carddemo.yaml`:
   - **BucketName**: set to your bucket name (e.g., `my-carddemo-bucket`).
   - **ImportJsonPath**: set to the S3 path of `mf-carddemo-datasets-import.json` (e.g., `s3://my-carddemo-bucket/IC3-card-demo/mf-carddemo-datasets-import.json`). This ensures the output `M2ImportJson` is correct.
   - **EngineVersion / InstanceType**: optionally adjust to your standards.

Note: Do not modify the `M2EnvironmentId` and `M2ApplicationId` outputs; Application Testing uses these values.

### Step 2: Create all necessary resources

Run the customized CloudFormation template to create required resources.

1. In the AWS CloudFormation console, choose **Create stack** → **With new resources (standard)**.
2. For **Prerequisite - Prepare template**, choose **Template is ready**.
3. For **Specify template**, choose **Upload a template file** and select `aws-m2-math-mf-carddemo.yaml`, then **Next**.
4. Provide a stack name and choose **Next**.
5. Keep default **Configure stack options** and choose **Next**.
6. Review and **Submit**.

Creation typically takes 10–15 minutes. The template appends a unique suffix to resource names so you can create multiple instances in parallel (useful for Application Testing).

### Automation

You can automate upload and deployment with the provided Makefile and script.

- `labs/2.CardDemo/Makefile`
- `labs/2.CardDemo/scripts/deploy_carddemo.sh`

Usage:

```bash
cd labs/2.CardDemo
make deploy S3_BUCKET=my-unique-carddemo-bucket STACK_NAME=carddemo-stack AWS_REGION=us-east-1
# With existing network (avoid new VPC limits):
make deploy S3_BUCKET=my-unique-carddemo-bucket STACK_NAME=carddemo-stack AWS_REGION=us-east-1 \
  VPC_ID=vpc-xxxxxxxx SUBNET1_ID=subnet-aaaaaaaa SUBNET2_ID=subnet-bbbbbbbb
```

The script will:

- Sync sources from `labs/2.CardDemo/source` to `s3://$S3_BUCKET/IC3-card-demo/mf/card-demo`
- Upload `mf-carddemo-datasets-import.json` to `s3://$S3_BUCKET/IC3-card-demo/mf-carddemo-datasets-import.json`
- Rewrite all dataset JSON `s3Location` paths to your bucket/prefix automatically
- Deploy the CloudFormation stack with `BucketName`, `AppKey` and `ImportJsonPath` parameters
- Print stack outputs

If `S3_BUCKET` is omitted, the script generates a unique bucket name like `carddemo-<account>-<region>-<timestamp>` and creates it automatically.

You don't need to manually edit S3 paths inside `mf-carddemo-datasets-import.json`. The script updates them to point at `s3://$S3_BUCKET/$S3_PREFIX/...`.

## M2 Application Definition

The CloudFormation template includes an M2 Application Definition that tells AWS Mainframe Modernization how to configure and run the CardDemo application. This definition maps the mainframe application structure to AWS M2 services.

### Application Definition Structure

The `M2AppDef` resource contains a JSON configuration that defines:

```json
{
  "template-version": "2.0",
  "source-locations": [...],
  "definition": {
    "listeners": [...],
    "dataset-location": {...},
    "batch-settings": {...},
    "cics-settings": {...},
    "xa-resources": [...]
  }
}
```

### Field Explanations and Source Code Relationships

#### 1. **Source Locations**
```json
"source-locations": [
  {
    "source-id": "s3-source",
    "source-type": "s3",
    "properties": {
      "s3-bucket": "${BucketName}",
      "s3-key-prefix": "${AppKey}"
    }
  }
]
```
- **Purpose**: Defines where M2 can find the application source code
- **Source Code Relationship**: Points to the `labs/2.CardDemo/source/` directory structure uploaded to S3
- **Maps to**: All files under `catalog/`, `loadlib/`, `rdef/`, `xa/` folders

#### 2. **Listeners**
```json
"listeners": [
  {
    "port": 7000,
    "type": "tn3270"
  }
]
```
- **Purpose**: Defines how users connect to the mainframe application
- **Source Code Relationship**: TN3270 is the standard terminal emulation protocol for mainframe access
- **Maps to**: CICS transaction processing system that handles user interactions

#### 3. **Dataset Location**
```json
"dataset-location": {
  "db-locations": [
    {
      "name": "${M2DbName.Value}",
      "secret-manager-arn": "${M2DbSecret}"
    }
  ]
}
```
- **Purpose**: Defines where application data is stored (Aurora PostgreSQL database)
- **Source Code Relationship**: Replaces traditional mainframe VSAM files with modern database storage
- **Maps to**: All `.DAT` files in `catalog/data/` that get imported as database tables

#### 4. **Batch Settings**
```json
"batch-settings": {
  "initiators": [
    {
      "classes": ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","0","1","2","3","4","5","6","7","8","9"],
      "description": "batch initiators for all job classes"
    }
  ],
  "jcl-file-location": "${!s3-source}/catalog/jcl"
}
```
- **Purpose**: Configures batch job processing capabilities
- **Source Code Relationship**: 
  - `initiators`: Defines job classes that can run batch jobs (A-Z, 0-9)
  - `jcl-file-location`: Points to JCL files in `catalog/jcl/` directory
- **Maps to**: All `.jcl` files in `catalog/jcl/` that define batch job workflows

#### 5. **CICS Settings**
```json
"cics-settings": {
  "binary-file-location": "${!s3-source}/loadlib",
  "csd-file-location": "${!s3-source}/rdef",
  "system-initialization-table": "CARDSIT"
}
```
- **Purpose**: Configures the CICS (Customer Information Control System) transaction processing environment
- **Source Code Relationship**:
  - `binary-file-location`: Points to compiled programs in `loadlib/` directory
  - `csd-file-location`: Points to resource definitions in `rdef/` directory  
  - `system-initialization-table`: References the CICS system initialization table
- **Maps to**: 
  - `loadlib/`: Contains compiled COBOL programs (`.so` files)
  - `rdef/`: Contains CICS resource definitions
  - `CARDSIT`: System initialization table for CICS configuration

#### 6. **XA Resources**
```json
"xa-resources": [
  {
    "name": "XASQL",
    "secret-manager-arn": "${M2DbSecret}",
    "module": "${!s3-source}/xa/ESPGSQLXA64.so"
  }
]
```
- **Purpose**: Configures XA (eXtended Architecture) resource managers for distributed transactions
- **Source Code Relationship**: Enables the application to participate in distributed transactions with the database
- **Maps to**: `xa/` directory containing XA resource adapter modules

### How It All Works Together

1. **Source Code Upload**: The deployment script uploads the entire `source/` directory structure to S3
2. **Application Definition**: M2 reads this definition to understand how to configure the runtime environment
3. **Runtime Configuration**: M2 creates a mainframe-like environment with:
   - CICS transaction processing system
   - Batch job processing capabilities  
   - Database connectivity via XA resources
   - TN3270 terminal access
4. **Data Import**: The `mf-carddemo-datasets-import.json` maps traditional mainframe datasets to database tables

This approach allows the CardDemo application to run on AWS M2 with minimal changes to the original mainframe code, while leveraging modern cloud infrastructure for scalability and reliability.

### Step 3: Deploy and start the application

**Note**: The CloudFormation template now includes an M2 Deployment resource (currently commented out) that can automatically deploy the application to the environment. If you uncomment the `M2Deployment` resource in the template, the application will be deployed automatically during stack creation. But our application need to connect to with database so we don't auto deploy application here.

Manual deployment (if M2Deployment is commented out):

1. In the AWS Mainframe Modernization console, go to **Applications**.
2. Choose the CardDemo application (e.g., `aws-m2-math-mf-carddemo-abc1d2e3`).
3. Choose **Actions** → **Deploy application**.
4. In **Environments**, select the corresponding runtime environment (same unique suffix).
5. Choose **Deploy** and wait until the state is **Ready**.
6. Choose **Actions** → **Start application** and wait until the state is **Running**.
7. On the application details page, copy the **Port** and **DNS Hostname** for connecting to the application.

### Step 4: Import initial data

To use CardDemo, import the initial datasets.

1. Download `mf-carddemo-datasets-import.json`.
2. Edit all `s3Location` values to point to your S3 bucket.
3. Upload the updated JSON back to your S3 bucket.
4. In the AWS Mainframe Modernization console, open your application → **Data sets** → **Import**.
5. Select the updated JSON file from S3 and **Submit**.

This job imports 23 datasets. Monitor the import job in the console. When all datasets are successfully imported, proceed to connect to the application.

Note: When using this template in Application Testing, the `M2ImportJson` output automatically handles the import process.

### Step 5: Connect to the CardDemo application

Use a 3270 emulator to connect to the running application with the DNS host and port from the application details page.

Example using `c3270`:

```bash
c3270 -port <port-number> <dns-hostname>
```

- **port**: The port from the application details page (e.g., `7000`).
- **Hostname**: The DNS Hostname from the application details page.

Refer to the application details page in the console to locate the Port and DNS Hostname.

## High Availability and Environment Management

The CardDemo application is configured with AWS M2 High Availability features to provide automatic scaling and traffic management capabilities. This section covers how to manage your environment after deployment.

### High Availability Configuration

The CloudFormation template includes the following High Availability parameters:

- **DesiredCapacity** (Default: 2): Initial number of M2 instances to deploy
- **MinCapacity** (Default: 1): Minimum number of instances for auto-scaling
- **MaxCapacity** (Default: 10): Maximum number of instances for auto-scaling
- **InstanceType** (Default: M2.m5.large): EC2 instance type for M2 runtime

### Auto Scaling Behavior

AWS M2 automatically manages your environment based on:

1. **Traffic Load**: The system monitors incoming connections and transaction volume
2. **Resource Utilization**: CPU, memory, and network usage are tracked
3. **Health Status**: Instance health and application responsiveness

**Scaling Triggers:**
- **Scale Out**: When traffic increases or resource utilization exceeds thresholds
- **Scale In**: When traffic decreases and resources are underutilized
- **Health Replacement**: Automatically replaces unhealthy instances

### Post-Deployment Environment Management

#### 1. Monitoring Your Environment

**AWS Console Monitoring:**
- Navigate to **AWS Mainframe Modernization** → **Environments**
- Select your environment to view:
  - Current instance count and status
  - Resource utilization metrics
  - Scaling events and history
  - Health status of individual instances

**Key Metrics to Monitor:**
- **Active Connections**: Number of TN3270 sessions
- **Transaction Throughput**: CICS transaction processing rate
- **Response Time**: Application response latency
- **Resource Utilization**: CPU, memory, and network usage

#### 2. Manual Scaling Operations

**Scale Up for High Traffic:**
```bash
# Update CloudFormation stack with higher capacity
aws cloudformation update-stack \
  --stack-name your-stack-name \
  --parameters ParameterKey=DesiredCapacity,ParameterValue=5 \
               ParameterKey=MaxCapacity,ParameterValue=20 \
  --capabilities CAPABILITY_NAMED_IAM
```

**Scale Down for Cost Optimization:**
```bash
# Update CloudFormation stack with lower capacity
aws cloudformation update-stack \
  --stack-name your-stack-name \
  --parameters ParameterKey=DesiredCapacity,ParameterValue=1 \
               ParameterKey=MinCapacity,ParameterValue=1 \
               ParameterKey=MaxCapacity,ParameterValue=5 \
  --capabilities CAPABILITY_NAMED_IAM
```

#### 3. Traffic Management Considerations

**Load Distribution:**
- AWS M2 automatically distributes traffic across available instances
- Each instance can handle multiple concurrent TN3270 sessions
- Database connections are pooled and managed efficiently

**Session Affinity:**
- TN3270 sessions maintain connection to specific instances
- Automatic failover occurs if an instance becomes unhealthy
- Users may need to reconnect if their instance is replaced

**Performance Optimization:**
- Monitor database connection pool utilization
- Consider RDS read replicas for read-heavy workloads
- Use CloudWatch alarms for proactive scaling

#### 4. Database Considerations

**RDS Aurora PostgreSQL Benefits:**
- **Automatic Failover**: Multi-AZ deployment provides high availability
- **Read Replicas**: Can be added for read scaling
- **Backup and Recovery**: Automated backups with point-in-time recovery
- **Performance Insights**: Built-in monitoring and optimization

**Database Scaling:**
- Aurora automatically scales storage (up to 128TB)
- Instance scaling can be done with minimal downtime
- Connection pooling handles multiple M2 instances efficiently

#### 5. Cost Management

**Scaling for Cost Optimization:**
- Set appropriate MinCapacity based on baseline traffic
- Use MaxCapacity to prevent unexpected cost spikes
- Monitor usage patterns to optimize DesiredCapacity
- Consider scheduled scaling for predictable workloads

**Cost Monitoring:**
- Use AWS Cost Explorer to track M2 and RDS costs
- Set up billing alerts for budget management
- Review scaling events to understand cost drivers

#### 6. Maintenance and Updates

**Planned Maintenance:**
- AWS handles infrastructure maintenance automatically
- Application updates can be deployed with zero downtime
- Database maintenance windows are configurable

**Rolling Updates:**
- M2 supports rolling deployments for application updates
- Instances are updated one at a time to maintain availability
- Health checks ensure updates don't impact running sessions

### Best Practices

1. **Start Conservative**: Begin with lower capacity and scale up based on actual usage
2. **Monitor Continuously**: Set up CloudWatch alarms for key metrics
3. **Plan for Peaks**: Configure MaxCapacity to handle expected traffic spikes
4. **Test Scaling**: Validate scaling behavior under controlled conditions
5. **Document Procedures**: Maintain runbooks for common scaling operations

### Troubleshooting Scaling Issues

**Common Issues:**
- **Scaling Too Aggressively**: Adjust scaling thresholds in CloudWatch
- **Insufficient Capacity**: Increase MaxCapacity or instance size
- **Database Bottlenecks**: Monitor RDS performance and consider scaling
- **Network Issues**: Check security groups and VPC configuration

**Recovery Procedures:**
- Manual scaling via CloudFormation updates
- Instance replacement through AWS console
- Database failover (automatic with Aurora Multi-AZ)


