import type { OpenNextConfig } from "@opennextjs/aws/types/open-next";

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "aws-lambda-streaming",
    },
  },
  imageOptimization: {
    override: {
      wrapper: "aws-lambda",
    },
  },
};

export default config;
