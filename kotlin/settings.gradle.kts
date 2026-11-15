pluginManagement {
    repositories {
        // Google's Maven Central mirror first: repo.maven.apache.org rate-limits (HTTP 429) busy egress IPs.
        maven("https://maven-central.storage-download.googleapis.com/maven2/")
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        // Google's Maven Central mirror first: repo.maven.apache.org rate-limits (HTTP 429) busy egress IPs.
        maven("https://maven-central.storage-download.googleapis.com/maven2/")
        mavenCentral()
    }
}

rootProject.name = "prism"
