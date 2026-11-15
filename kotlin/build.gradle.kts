plugins {
    kotlin("jvm") version "2.4.20"
    kotlin("plugin.serialization") version "2.4.20"
    `java-library`
}

group = "dev.knowhere"
version = "0.1.0"

// Target Java 17 bytecode (Android-compatible) with whatever JDK runs Gradle (17+).
java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    explicitApi()
    compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
}

dependencies {
    api("org.jetbrains.kotlinx:kotlinx-serialization-json:1.12.0")
    implementation("com.materialkolor:material-color-utilities:5.0.1")
    testImplementation(platform("org.junit:junit-bom:5.13.4"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testImplementation("org.junit.jupiter:junit-jupiter-params")
    testImplementation(kotlin("test-junit5"))
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
    // Shared contract fixtures and golden files live at the repository root.
    systemProperty("prism.repoRoot", rootDir.parentFile.absolutePath)
    inputs.dir(rootDir.resolve("../contracts")).withPropertyName("contracts")
    inputs.dir(rootDir.resolve("../testdata")).withPropertyName("testdata")
    testLogging { events("failed"); exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL }
}
