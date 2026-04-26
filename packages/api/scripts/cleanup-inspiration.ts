// Inspiration cleanup is handled via S3 lifecycle policy on the staging prefix.
// Rule: s3://{app-bucket}/workspaces/*/uploads/inspiration/ → expire after 1 day
// See deployment slice 50 for the Terraform/CDK resource definition.
console.warn(
  "Inspiration cleanup is implemented via S3 lifecycle policy on the staging prefix. See deployment slice 50.",
);
