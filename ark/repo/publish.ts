import { getShellOutput, shell } from "@ark/fs"
import { throwError } from "@ark/util"
import { preview } from "../docs/lib/bench/preview.ts"
import { packagesByScope, publishedVersionsOf, publishOrder } from "./shared.ts"

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
		isOnNpm: (await publishedVersionsOf(pkg.name)).includes(pkg.version)
	}))
)

type Release = (typeof releases)[number]

const publish = (release: Release) => {
	shell(
		`pnpm publish --no-git-checks --tag ${distTagOf(release.pkg.version)}${dryRun ? " --dry-run" : ""}`,
		{ cwd: release.pkg.path }
	)
	if (!dryRun) release.isOnNpm = true
}

// what origin has, since a tag a failed local run created was never pushed
const existingTags = new Set(
	getShellOutput("git ls-remote --tags origin")
		.split("\n")
		.map(line => line.split("refs/tags/")[1]?.replace("^{}", ""))
)

const existingReleases = new Set(
	getShellOutput(
		`gh release list --limit 10000 --json tagName --jq ".[].tagName"`
	).split("\n")
)

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

for (const release of toPublish) publish(release)

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
		`\nsite: ${deploysSite ? "deploys" : `not deployed, since ${packagesByScope.type.name}@${packagesByScope.type.version} is a prerelease`}`
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
