# --- Build stage ---
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# --- Runtime stage ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S wealthos && adduser -S wealthos -G wealthos

COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
RUN chown -R wealthos:wealthos /app
USER wealthos

EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=docker

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD wget -q --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]