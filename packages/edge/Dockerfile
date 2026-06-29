# Baryon Edge agent image — runs the agent with the read-only data plane.
# Network isolation is enforced by docker-compose (internal network + egress
# allowlist proxy), NOT by this image alone.
FROM node:22-bookworm-slim

# Install the CLI + the edge sandbox (pulls pg + @aws-sdk/client-s3).
RUN npm install -g @baryonlabs/cli @baryonlabs/edge @earendil-works/pi-coding-agent \
  && npm cache clean --force

# Non-root for least privilege.
RUN useradd -m agent
USER agent
WORKDIR /work

# All outbound (except the allowlisted proxy) is blocked by compose networking.
# The agent reaches Postgres/MinIO only through the read-only MCP servers.
ENTRYPOINT ["baryon-edge"]
