#!/bin/bash

# AWS Fargate MCP Server Cleanup Script
# Run this to delete all AWS resources created during deployment

set -e

REGION="ap-southeast-2"
CLUSTER_NAME="hello-mcp-cluster"
SERVICE_NAME="hello-mcp-service"
TASK_FAMILY="hello-mcp-task"
ECR_REPO="hello-mcp-fargate"
ALB_NAME="hello-mcp-alb"
TARGET_GROUP_NAME="hello-mcp-tg"
SECURITY_GROUP_NAME="hello-mcp-sg"

echo "🗑️  Cleaning up AWS Fargate MCP Server resources..."

# 1. Delete ECS Service
echo "Deleting ECS service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --desired-count 0 \
  --region $REGION 2>/dev/null || echo "Service not found or already deleted"

aws ecs delete-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force \
  --region $REGION 2>/dev/null || echo "Service not found or already deleted"

echo "Waiting for service to be deleted..."
sleep 10

# 2. Delete ECS Cluster
echo "Deleting ECS cluster..."
aws ecs delete-cluster \
  --cluster $CLUSTER_NAME \
  --region $REGION 2>/dev/null || echo "Cluster not found or already deleted"

# 3. Deregister Task Definitions
echo "Deregistering task definitions..."
TASK_ARNS=$(aws ecs list-task-definitions \
  --family-prefix $TASK_FAMILY \
  --region $REGION \
  --query 'taskDefinitionArns[]' \
  --output text 2>/dev/null || echo "")

for ARN in $TASK_ARNS; do
  echo "Deregistering $ARN..."
  aws ecs deregister-task-definition \
    --task-definition $ARN \
    --region $REGION 2>/dev/null || echo "Failed to deregister $ARN"
done

# 4. Delete ALB
echo "Deleting Application Load Balancer..."
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names $ALB_NAME \
  --region $REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || echo "")

if [ ! -z "$ALB_ARN" ] && [ "$ALB_ARN" != "None" ]; then
  aws elbv2 delete-load-balancer \
    --load-balancer-arn $ALB_ARN \
    --region $REGION 2>/dev/null || echo "Failed to delete ALB"

  echo "Waiting for ALB to be deleted..."
  sleep 30
fi

# 5. Delete Target Group
echo "Deleting target group..."
TG_ARN=$(aws elbv2 describe-target-groups \
  --names $TARGET_GROUP_NAME \
  --region $REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null || echo "")

if [ ! -z "$TG_ARN" ] && [ "$TG_ARN" != "None" ]; then
  aws elbv2 delete-target-group \
    --target-group-arn $TG_ARN \
    --region $REGION 2>/dev/null || echo "Failed to delete target group"
fi

# 6. Delete Security Groups
echo "Deleting security groups..."
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" \
  --region $REGION \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "")

if [ ! -z "$SG_ID" ] && [ "$SG_ID" != "None" ]; then
  aws ec2 delete-security-group \
    --group-id $SG_ID \
    --region $REGION 2>/dev/null || echo "Failed to delete security group (may have dependencies)"
fi

# 7. Delete ECR images and repository
echo "Deleting ECR repository..."
aws ecr delete-repository \
  --repository-name $ECR_REPO \
  --region $REGION \
  --force 2>/dev/null || echo "Repository not found or already deleted"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Note: Some resources may take a few minutes to fully delete."
echo "If you encounter errors, wait a few minutes and run this script again."
