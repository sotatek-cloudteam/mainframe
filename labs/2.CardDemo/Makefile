SHELL := /bin/bash

# Usage:
#   make deploy S3_BUCKET=my-carddemo-bucket [STACK_NAME=carddemo-stack] [AWS_REGION=us-east-1]

AWS_REGION ?= us-east-1
STACK_NAME ?= carddemo-stack
S3_BUCKET  ?= carddemo-bucket-115228050885
S3_PREFIX  ?= IC3-card-demo/mf/card-demo

LAB_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
SCRIPT := $(LAB_DIR)/scripts/deploy_carddemo.sh

.PHONY: deploy
deploy:
	AWS_REGION=$(AWS_REGION) STACK_NAME=$(STACK_NAME) S3_BUCKET=$(S3_BUCKET) S3_PREFIX=$(S3_PREFIX) bash $(SCRIPT)

.PHONY: print-vars
print-vars:
	@echo AWS_REGION=$(AWS_REGION)
	@echo STACK_NAME=$(STACK_NAME)
	@echo S3_BUCKET=$(S3_BUCKET)
	@echo S3_PREFIX=$(S3_PREFIX)


