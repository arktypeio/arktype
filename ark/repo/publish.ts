import { getShellOutput, shell } from "@ark/fs"
import { throwError } from "@ark/util"
import { spawn } from "node:child_process"
import { preview } from "../docs/lib/bench/preview.ts"
import { isVersionOnNpm, packagesByScope, publishOrder } from "./shared.ts"

// publishes each version npm doesn't have yet, then tags and releases each one
// npm has, so a rerun after a failure finishes what the failed run started.
// --dry-run packs each publish and prints the rest without changing anything.
const dryRun = process.argv.includes("--dry-run")

const isPrerelease = (version: string) => version.includes("-")

// a prerelease goes to next, so installs keep resolving the latest stable
const distTagOf = (version: string) =>
	isPrerelease(version) ? "next" : "latest"

// each package publishes under exactly one name, since every alias is another
// identity CI can publish and a way to install two copies of one runtime
const releases = await Promise.all(
	publishOrder.map(async pkg => ({
		pkg,
		tag: `${pkg.name}@${pkg.version}`,
		isOnNpm: await isVersionOnNpm(pkg.name, pkg.version)
	}))
)

type Release = (typeof releases)[number]

// npm reserves a version immediately on PUT 202 while its per-version GET can
// still return 404 until async processing finishes (~1-20 min), so treat a
// duplicate-version rejection as already published
const alreadyPublishedMatcher =
	/cannot publish over the previously published versions|epublishconflict/i

type PublishExit = {
	code: number | null
	signal: NodeJS.Signals | null
}

// what origin has, since a tag a failed local run created was never pushed
const existingTags = new Set(
	getShellOutput("git ls-remote --tags origin")
		.split("\n")
		.map(line => line.split("refs/tags/")[1]?.replace("^{}", ""))
)

const localTags = new Set(
	getShellOutput("git tag --list").split("\n").filter(Boolean)
)

const existingReleases = new Set(
	getShellOutput(
		`gh release list --limit 10000 --json tagName --jq ".[].tagName"`
	).split("\n")
)

const publish = async (release: Release) => {
	const args = [
		"publish",
		"--no-git-checks",
		"--tag",
		distTagOf(release.pkg.version),
		...(dryRun ? ["--dry-run"] : [])
	]
	const child = spawn("pnpm", args, {
		cwd: release.pkg.path,
		stdio: ["inherit", "pipe", "pipe"],
		shell: process.platform === "win32"
	})
	let output = ""
	child.stdout.setEncoding("utf8")
	child.stderr.setEncoding("utf8")
	child.stdout.on("data", (chunk: string) => {
		process.stdout.write(chunk)
		output += chunk
	})
	child.stderr.on("data", (chunk: string) => {
		process.stderr.write(chunk)
		output += chunk
	})
	const { code, signal } = await new Promise<PublishExit>((resolve, reject) => {
		child.on("error", reject)
		child.on("close", (exitCode, exitSignal) =>
			resolve({ code: exitCode, signal: exitSignal })
		)
	})
	if (code !== 0) {
		if (!dryRun && alreadyPublishedMatcher.test(output)) {
			if (await isVersionOnNpm(release.pkg.name, release.pkg.version)) {
				console.log(`${release.tag} is already published on npm; continuing.`)
				release.isOnNpm = true
				return
			}
			if (existingTags.has(release.tag) || localTags.has(release.tag)) {
				console.warn(
					`${release.tag} was rejected as already published and isVersionOnNpm still returned false, but git tag ${release.tag} already exists (npm PUT 202 async queue); continuing.`
				)
				release.isOnNpm = true
				return
			}
			throwError(
				`${release.tag} was rejected as already published, but isVersionOnNpm returned false and git tag ${release.tag} does not exist (version was likely unpublished and cannot be reused)`
			)
		}
		throwError(
			`pnpm ${args.join(" ")} failed for ${release.tag} (exit ${code ?? signal})`
		)
	}
	if (!dryRun) release.isOnNpm = true
}

const toPublish = releases.filter(release => !release.isOnNpm)

// a stable arktype deploys the site, whose homepage calls precompile
// unreleased and its numbers a draft while preview is set
const stableType = toPublish.find(
	({ pkg }) => pkg.scope === "type" && !isPrerelease(pkg.version)
)
if (preview && stableType) {
	throwError(
		`${stableType.tag} can't be published while preview is set in ark/docs/lib/bench/preview.ts. Rerun the homepage bench on the release commit and remove preview, or publish a prerelease.`
	)
}

for (const release of toPublish) await publish(release)

// in a dry run, what the publishes above would have put on npm
const onNpm = dryRun ? releases : releases.filter(release => release.isOnNpm)

// a tag or GitHub release that's missing for a version on npm is one a failed
// run didn't get to, so it's created now, at the commit being published
const toTag = onNpm.filter(({ tag }) => !existingTags.has(tag))
const toRelease = onNpm.filter(({ tag }) => !existingReleases.has(tag))

// GitHub's latest release is arktype's
const releaseFlagsOf = ({ pkg }: Release) =>
	isPrerelease(pkg.version) ? "--prerelease"
	: pkg.scope === "type" ? "--latest"
	: "--latest=false"

// a prerelease's docs deploy under its major, e.g. arktype.io/3, beside the
// stable docs, which publish.yml rebuilds from the latest stable tag
const deploysSite = !isPrerelease(packagesByScope.type.version)

if (dryRun) {
	const list = (heading: string, items: string[]) =>
		console.log(
			`\n${heading}:${items.length ? items.map(item => `\n  ${item}`).join("") : " none"}`
		)
	list(
		"publish",
		toPublish.map(
			({ tag, pkg }) => `${tag} under the ${distTagOf(pkg.version)} dist-tag`
		)
	)
	list(
		"skip, already on npm",
		releases.filter(release => release.isOnNpm).map(({ tag }) => tag)
	)
	list(
		"tag and push",
		toTag.map(({ tag }) => tag)
	)
	list(
		"create GitHub release",
		toRelease.map(release => `${release.tag} ${releaseFlagsOf(release)}`)
	)
	// publish.yml's version job decides the same way
	console.log(
		`\nsite: ${deploysSite ? "deploys" : `deploys the latest stable docs, with ${packagesByScope.type.name}@${packagesByScope.type.version}'s at /${packagesByScope.type.version.split(".")[0]}`}`
	)
} else {
	for (const { tag } of toTag) shell(`git tag --force ${tag}`)
	if (toTag.length) {
		shell(
			`git push origin ${toTag.map(({ tag }) => `refs/tags/${tag}`).join(" ")}`
		)
	}
	for (const release of toRelease)
		shell(`gh release create ${release.tag} ${releaseFlagsOf(release)}`)
}
