#!/usr/bin/env bash

set -euo pipefail

# Automates CardDemo upload to S3 and CloudFormation deployment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAB_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Configurable inputs (env vars with sensible defaults)
: "${AWS_REGION:=us-east-1}"
: "${STACK_NAME:=carddemo-stack}"
: "${S3_BUCKET:=}"
: "${S3_PREFIX:=IC3-card-demo/mf/card-demo}"
: "${VPC_ID:=vpc-0d13f4a066e668ecd}"
: "${SUBNET1_ID:=subnet-06cb8fef122bc5b87}"
: "${SUBNET2_ID:=subnet-0b1f0f779b4afa44c}"

SOURCE_ROOT="${LAB_DIR}/source"
TEMPLATE_FILE="${SOURCE_ROOT}/IC3-card-demo/aws-m2-math-mf-carddemo.yaml"
IMPORT_JSON_LOCAL="${SOURCE_ROOT}/IC3-card-demo/mf-carddemo-datasets-import.json"
IMPORT_JSON_S3=""
IMPORT_JSON_TMP=""

function require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' not found in PATH" >&2
    exit 1
  fi
}

require_cmd aws

function get_account_id() {
  aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "000000000000"
}

function bucket_exists() {
  local bucket="$1"
  aws s3api head-bucket --bucket "$bucket" 2>/dev/null
}

function create_bucket_if_needed() {
  local bucket="$1"
  if bucket_exists "$bucket"; then
    return 0
  fi
  echo "Creating S3 bucket: ${bucket} in ${AWS_REGION} ..."
  if [[ "${AWS_REGION}" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$bucket" --region "${AWS_REGION}"
  else
    aws s3api create-bucket --bucket "$bucket" --region "${AWS_REGION}" --create-bucket-configuration LocationConstraint="${AWS_REGION}"
  fi
}

# Generate a unique bucket name if not provided
if [[ -z "${S3_BUCKET}" ]]; then
  ACCOUNT_ID="$(get_account_id)"
  TS="$(date +%s)"
  S3_BUCKET="carddemo-${ACCOUNT_ID}-${AWS_REGION}-${TS}"
  echo "No S3_BUCKET provided. Generated unique bucket: ${S3_BUCKET}"
fi

IMPORT_JSON_S3="s3://${S3_BUCKET}/IC3-card-demo/mf-carddemo-datasets-import.json"

echo "Using configuration:"
echo "  AWS_REGION     = ${AWS_REGION}"
echo "  STACK_NAME     = ${STACK_NAME}"
echo "  S3_BUCKET      = ${S3_BUCKET}"
echo "  S3_PREFIX      = ${S3_PREFIX}"
echo "  TEMPLATE       = ${TEMPLATE_FILE}"
echo "  IMPORT_JSON_S3 = ${IMPORT_JSON_S3}"
echo "  VPC_ID         = ${VPC_ID}"
echo "  SUBNET1_ID     = ${SUBNET1_ID}"
echo "  SUBNET2_ID     = ${SUBNET2_ID}"

if [[ ! -f "${TEMPLATE_FILE}" ]]; then
  echo "Error: CloudFormation template not found at ${TEMPLATE_FILE}" >&2
  exit 1
fi

if [[ ! -f "${IMPORT_JSON_LOCAL}" ]]; then
  echo "Error: Import JSON not found at ${IMPORT_JSON_LOCAL}" >&2
  exit 1
fi

create_bucket_if_needed "${S3_BUCKET}"

echo "Syncing CardDemo sources to s3://${S3_BUCKET}/${S3_PREFIX} ..."
aws s3 sync "${SOURCE_ROOT}/catalog" "s3://${S3_BUCKET}/${S3_PREFIX}/catalog" --delete --region "${AWS_REGION}"
aws s3 sync "${SOURCE_ROOT}/loadlib" "s3://${S3_BUCKET}/${S3_PREFIX}/loadlib" --delete --region "${AWS_REGION}"
aws s3 sync "${SOURCE_ROOT}/rdef"    "s3://${S3_BUCKET}/${S3_PREFIX}/rdef"    --delete --region "${AWS_REGION}"
aws s3 sync "${SOURCE_ROOT}/xa"      "s3://${S3_BUCKET}/${S3_PREFIX}/xa"      --delete --region "${AWS_REGION}"

echo "Preparing dataset import JSON for bucket/prefix..."
IMPORT_JSON_TMP="$(mktemp)"
BASE_OLD="s3://my-carddemo-bucket/IC3-card-demo/mf/card-demo"
BASE_NEW="s3://${S3_BUCKET}/${S3_PREFIX}"
sed "s|${BASE_OLD}|${BASE_NEW}|g" "${IMPORT_JSON_LOCAL}" > "${IMPORT_JSON_TMP}"

echo "Uploading dataset import JSON to ${IMPORT_JSON_S3} ..."
aws s3 cp "${IMPORT_JSON_TMP}" "${IMPORT_JSON_S3}" --region "${AWS_REGION}"

echo "Deploying CloudFormation stack: ${STACK_NAME} ..."
aws cloudformation deploy \
  --stack-name "${STACK_NAME}" \
  --template-file "${TEMPLATE_FILE}" \
  --parameter-overrides \
    BucketName="${S3_BUCKET}" \
    AppKey="${S3_PREFIX}" \
    ImportJsonPath="${IMPORT_JSON_S3}" \
    VpcId="${VPC_ID}" \
    Subnet1Id="${SUBNET1_ID}" \
    Subnet2Id="${SUBNET2_ID}" \
  --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --region "${AWS_REGION}"

echo "Fetching stack outputs..."
aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${AWS_REGION}" \
  --query 'Stacks[0].Outputs' \
  --output table

cat <<EOF

Next steps:
1) In the AWS Mainframe Modernization console, locate the application created by the stack.
2) Deploy the application to the environment and then Start the application.
3) Use the output M2ImportJson (or the uploaded JSON) to import datasets if not automated.

EOF

echo "Done."


