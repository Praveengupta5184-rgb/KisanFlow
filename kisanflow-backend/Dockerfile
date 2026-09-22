FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -DskipTests dependency:go-offline
COPY src src
RUN mvn -DskipTests package

FROM eclipse-temurin:17-jre-jammy AS runtime
RUN useradd --system --create-home spring
WORKDIR /app
COPY --from=build /workspace/target/*.jar app.jar
USER spring
EXPOSE 8080
ENTRYPOINT ["java","-XX:MaxRAMPercentage=75.0","-jar","/app/app.jar"]
