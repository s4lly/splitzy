FROM rocicorp/zero:0.25.5

# Expose the Zero cache port
EXPOSE 4848

# Create data directory for SQLite replica
# Note: Use high IOPS disk for production
RUN mkdir -p /data && chmod 755 /data

# Set working directory
WORKDIR /app

# Healthcheck (matches docker-compose specification)
# Note: curl should be available in the base image
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4848/keepalive || exit 1

# Default environment variables (can be overridden at runtime)
ENV ZERO_REPLICA_FILE=/data/zero.db

# The base image should already have the appropriate CMD/ENTRYPOINT
# No need to override unless customizing the startup behavior

