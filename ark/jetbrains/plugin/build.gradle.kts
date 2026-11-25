import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType
import org.jetbrains.intellij.platform.gradle.TestFrameworkType

plugins {
	kotlin("jvm")
	id("org.jetbrains.intellij.platform")
}

group = "io.arktype"
version = "0.1.0"

kotlin {
	jvmToolchain(21)
}

repositories {
	mavenCentral()
	intellijPlatform {
		defaultRepositories()
	}
}

dependencies {
	implementation(project(":core"))
	testImplementation("junit:junit:4.13.2")
	testImplementation("org.opentest4j:opentest4j:1.3.0")
	intellijPlatform {
		webstorm(providers.gradleProperty("platformVersion"))
		bundledPlugin("JavaScript")
		testFramework(TestFrameworkType.Platform)
	}
}

intellijPlatform {
	// the settings page has a handful of options; indexing them for search
	// starts a whole IDE on every build
	buildSearchableOptions = false
	pluginConfiguration {
		ideaVersion {
			sinceBuild = "252"
			untilBuild = provider { null }
		}
	}
	// the oldest and newest WebStorm the plugin declares it supports, and
	// IntelliJ IDEA, whose JavaScript support is the same plugin
	pluginVerification {
		ides {
			create(IntelliJPlatformType.WebStorm, "2025.2.6.4")
			create(IntelliJPlatformType.WebStorm, providers.gradleProperty("platformVersion"))
			create(IntelliJPlatformType.IntellijIdea, providers.gradleProperty("platformVersion"))
		}
	}
	// see ark/jetbrains/README.md#publishing
	signing {
		certificateChain = providers.environmentVariable("CERTIFICATE_CHAIN")
		privateKey = providers.environmentVariable("PRIVATE_KEY")
		password = providers.environmentVariable("PRIVATE_KEY_PASSWORD")
	}
	publishing {
		token = providers.environmentVariable("PUBLISH_TOKEN")
	}
}

tasks.test {
	systemProperty("ark.repoRoot", rootDir.parentFile.parentFile.absolutePath)
}
