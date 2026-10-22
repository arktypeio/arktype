import { getShellOutput, readFile, shell, writeFile } from "@ark/fs"
import {
	packagesByScope,
	publishedVersionsOf,
	publishOrder,
	type ArkPackage,
	type PackageScope
} from "./shared.ts"

// publishes each version npm doesn't have yet, then tags and releases each one
// npm has, so a rerun after a failure finishes what the failed run started.
// --dry-run packs each publish and prints the rest without changing anything.
const dryRun = process.argv.includes("--dry-run")

// whether a package also ships as the @arktype/ name it had before @ark/
const hasLegacyAlias = {
	attest: true,
	"fast-check": true,
	fs: true,
	"json-schema": true,
	precompile: false,
	regex: true,
	schema: true,
	sets: false,
	type: true,
	util: true
} satisfies Record<PackageScope, boolean>

// the primary name (arktype, arkregex, arksets or @ark/*), then its aliases
const namesOf = (pkg: ArkPackage) => {
	const names = [pkg.name]
	if (pkg.scope === "type") names.push("@ark/type")
	if (pkg.scope === "regex") names.push("@ark/regex")
	if (pkg.scope === "sets") names.push("@ark/sets")
	if (hasLegacyAlias[pkg.scope]) names.push(`@arktype/${pkg.scope}`)
	return names
}

const isPrerelease = (version: string) => version.includes("-")

// a prerelease goes to next, so installs keep resolving the latest stable
const distTagOf = (version: string) =>
	isPrerelease(version) ? "next" : "latest"

const releases = await Promise.all(
	publishOrder.flatMap(pkg =>
		namesOf(pkg).map(async name => ({
			pkg,
			name,
			tag: `${name}@${pkg.version}`,
			isOnNpm: (await publishedVersionsOf(name)).includes(pkg.version)
		}))
	)
)

type Release = (typeof releases)[number]

const publish = (release: Release) => {
	const { pkg, name } = release
	const packageJson = readFile(pkg.packageJsonPath)
	if (name !== pkg.name) {
		writeFile(
			pkg.packageJsonPath,
			packageJson.replace(`"name": "${pkg.name}"`, `"name": "${name}"`)
		)
	}
	try {
		shell(
			`pnpm publish --no-git-checks --tag ${distTagOf(pkg.version)}${dryRun ? " --dry-run" : ""}`,
			{ cwd: pkg.path }
		)
	} finally {
		writeFile(pkg.packageJsonPath, packageJson)
	}
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

for (const release of toPublish) publish(release)

// in a dry run, what the publishes above would have put on npm
const onNpm = dryRun ? releases : releases.filter(release => release.isOnNpm)

// a tag or GitHub release that's missing for a version on npm is one a failed
// run didn't get to, so it's created now, at the commit being published
const toTag = onNpm.filter(({ tag }) => !existingTags.has(tag))
const toRelease = onNpm.filter(({ tag }) => !existingReleases.has(tag))

// GitHub's latest release is arktype's
const releaseFlagsOf = ({ pkg, name }: Release) =>
	isPrerelease(pkg.version) ? "--prerelease"
	: name === packagesByScope.type.name ? "--latest"
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
