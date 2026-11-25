// Everything that doesn't need the IDE: the TextMate engine that runs VS
// Code's grammars and the ErrorLens message rewriting. Its tests run without
// downloading an IDE.
plugins {
	kotlin("jvm")
}

kotlin {
	jvmToolchain(21)
}

repositories {
	mavenCentral()
}

dependencies {
	// the IDE provides the Kotlin stdlib and Gson at runtime
	compileOnly(kotlin("stdlib"))
	compileOnly("com.google.code.gson:gson:2.11.0")
	implementation("org.jruby.joni:joni:2.2.6")
	testImplementation(kotlin("stdlib"))
	testImplementation("com.google.code.gson:gson:2.11.0")
	testImplementation(platform("org.junit:junit-bom:5.13.4"))
	testImplementation("org.junit.jupiter:junit-jupiter")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

// VS Code's grammars, written from ark/extension and @shikijs/langs by
// scripts/writeGrammars.ts (run `pnpm i` first)
val grammarDir = layout.buildDirectory.dir("generated/grammars")
val writeGrammars by tasks.registering(Exec::class) {
	inputs.file("../scripts/writeGrammars.ts")
	inputs.file("../../extension/injected.tmLanguage.json")
	inputs.file("../../extension/package.json")
	inputs.file("../package.json")
	outputs.dir(grammarDir)
	workingDir = projectDir.parentFile
	commandLine("node", "./scripts/writeGrammars.ts", grammarDir.get().asFile.absolutePath)
}

sourceSets.main {
	resources.srcDir(writeGrammars)
}

// the VS Code extension's manifest, whose ErrorLens defaults (the replace
// rules above all) the plugin applies as they ship
// the editor conformance suite, whose scope-to-category mapping the plugin
// colors by and whose fixtures the tests check against
val conformanceDir: String = providers.gradleProperty("ark.conformanceDir")
	.getOrElse(rootDir.resolve("../editor-conformance").absolutePath)

tasks.processResources {
	from("../../extension/package.json") {
		into("io/arktype/jetbrains")
		rename { "extension.package.json" }
	}
	from("$conformanceDir/highlighting/categories.json") {
		into("io/arktype/jetbrains")
	}
}

tasks.test {
	useJUnitPlatform()
	// the repo root, so tests can read ark/extension and ark/editor-conformance
	systemProperty("ark.repoRoot", rootDir.parentFile.parentFile.absolutePath)
	systemProperty("ark.conformanceDir", conformanceDir)
	testLogging {
		events("failed")
		exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
	}
}

// Dumps the engine's tokens for scripts/diffEngine.ts, which compares them to
// the vscode-textmate oracle's: ./gradlew :core:dumpTokens --args="..."
val dumpTokensRuntime by configurations.creating
dependencies {
	dumpTokensRuntime(kotlin("stdlib"))
	dumpTokensRuntime("com.google.code.gson:gson:2.11.0")
}
// Dumps the highlighting the IDE shows, for ark/editor-conformance's
// check.ts: ./gradlew :core:dumpHighlights --args="<outDir> <file>..."
tasks.register<JavaExec>("dumpHighlights") {
	classpath = sourceSets.main.get().runtimeClasspath + dumpTokensRuntime
	mainClass = "io.arktype.jetbrains.highlight.DumpHighlightsKt"
	workingDir = rootDir.parentFile.parentFile
	maxHeapSize = "2g"
}

tasks.register<JavaExec>("dumpTokens") {
	classpath = sourceSets.main.get().runtimeClasspath + dumpTokensRuntime
	mainClass = "io.arktype.jetbrains.textmate.DumpTokensKt"
	workingDir = rootDir.parentFile.parentFile
	maxHeapSize = "2g"
}
