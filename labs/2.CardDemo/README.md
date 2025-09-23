### CardDemo Tutorial — Set up in AWS Mainframe Modernization Application Testing

This guide describes how to set up the CardDemo sample application for replatforming with Micro Focus on AWS Mainframe Modernization managed service, including use with AWS Mainframe Modernization Application Testing. The sample AWS CloudFormation template provisions a database, a runtime environment, an application, and a fully isolated network environment.

Note: The template creates AWS resources that may incur costs.

### Prerequisites

- **Download artifacts**: `IC3-card-demo-zip` and `datasets_Mainframe_ebcdic.zip` (contain the CardDemo sample and datasets).
- **Create an S3 bucket**: for example, `my-carddemo-bucket` to store artifacts.

### Step 1: Prepare to set up CardDemo (using local sources)

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

### Step 3: Deploy and start the application

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

- **port**: The port from the application details page (e.g., `6000`).
- **Hostname**: The DNS Hostname from the application details page.

Refer to the application details page in the console to locate the Port and DNS Hostname.


