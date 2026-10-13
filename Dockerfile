# ── Stage 1: Build ────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /workspace

# Copy Maven wrapper and pom first (layer-cache dependencies)
COPY mvnw ./
COPY .mvn .mvn
COPY pom.xml ./

# Download dependencies without building the full project
RUN ./mvnw dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN ./mvnw package -DskipTests -B

# ── Stage 2: Runtime ───────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime

# Non-root user for security
RUN addgroup -S bookstore && adduser -S bookstore -G bookstore
USER bookstore

WORKDIR /app

# Copy the fat JAR from the build stage
COPY --from=build /workspace/target/bookstore-api-1.0.0.jar app.jar

# Expose the application port
EXPOSE 8080

# JVM tuning for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
