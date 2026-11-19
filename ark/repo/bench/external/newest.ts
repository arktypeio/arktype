// what reproduce.ts --newest installs in a suite: each rival at its newest
// release, with the packages its build step needs at the versions that
// release names, and a rival whose newest release the suite can't build kept
// at the last one it could. reproduce.ts asks npm and runs the installs;
// these are functions of the answers, so
// ark/repo/__tests__/newest.test.ts can pin them down

/** a rival's newest release that a suite couldn't build, and the release it was measured at instead */
export type Held = {
	newest: string
	kept: string
}

export type SpecsPlan = {
	/** the suite's pins, as `name@version` */
	releases: readonly string[]
	/** each toolchain package's version for its rival's newest release */
	tools: Record<string, string>
	/** the rivals kept back */
	held: Record<string, Held>
	/** what the suite's last run installed */
	last: Record<string, string>
}

export type HoldsPlan = {
	releases: readonly string[]
	/** what the suite's last run installed, which built */
	last: Record<string, string>
	/** each rival's newest release */
	latest: Record<string, string>
}

/** the packages a rival's build step runs on, which move when it does: typia's transform compiles under ttsc, and a bundler reaches it through ttsc's unplugin */
export const toolchains: Record<string, readonly string[]> = {
	typia: ["ttsc", "@ttsc/unplugin"]
}

export const packageOf = (release: string): string =>
	release.replace(/(.)@.*$/, "$1")

const versionOf = (release: string) =>
	release.slice(packageOf(release).length + 1)

/** the rival among a suite's releases whose toolchain a package belongs to */
export const ownerOf = (
	name: string,
	releases: readonly string[]
): string | undefined =>
	releases.map(packageOf).find(rival => toolchains[rival]?.includes(name))

const partsOf = (version: string) => version.split(".").map(Number)

/** the highest release among the versions `npm view <package>@<range> version --json` answers with: one string for one match, a list for more. A prerelease isn't one */
export const highestOf = (versions: string | readonly string[]): string => {
	const releases = [versions]
		.flat()
		.filter(version => /^\d+\.\d+\.\d+$/.test(version))
	if (!releases.length) throw new Error(`No release among ${versions}`)
	return releases.reduce((best, version) => {
		const [l, r] = [partsOf(best), partsOf(version)]
		const at = l.findIndex((part, i) => part !== r[i])
		return at !== -1 && r[at] > l[at] ? version : best
	})
}

/** what to install in a suite: each rival at its newest release with its toolchain beside it, or at the release it's held at with the toolchain that built it. A held rival's toolchain package the last run didn't record stays at the suite's own pin, so it isn't installed */
export const specsFor = ({
	releases,
	tools,
	held,
	last
}: SpecsPlan): string[] =>
	releases.flatMap(release => {
		const name = packageOf(release)
		const owner = ownerOf(name, releases)
		if (!owner) return `${name}@${held[name]?.kept ?? "latest"}`
		if (!held[owner]) return `${name}@${tools[name]}`
		return name in last ? `${name}@${last[name]}` : []
	})

/** the rivals to keep back once a suite fails at their newest releases: those with a build step, each at the release the suite last built, or at its pin if it has no run yet. One with neither, or already at its newest release isn't why the suite failed */
export const holdsFor = ({
	releases,
	last,
	latest
}: HoldsPlan): Record<string, Held> =>
	Object.fromEntries(
		releases.flatMap(release => {
			const name = packageOf(release)
			const kept = last[name] ?? versionOf(release)
			return name in toolchains && kept && kept !== latest[name] ?
					[[name, { newest: latest[name], kept }]]
				:	[]
		})
	)
