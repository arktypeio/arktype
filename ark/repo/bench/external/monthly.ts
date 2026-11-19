// the steps of the monthly rerun (.github/workflows/leaderboard.yml) around
// the benchmarks themselves. Each keeps what it writes in <dir>, which the
// workflow uploads as the run's artifact.
//
// node monthly.ts baseline <dir>
//   before the rerun: checks the site's claims (headline.ts) and has the docs
//   write their checked-in text (writeMarkdown.ts), keeping whatever that
//   changes at this commit, then restores it
// node monthly.ts report <dir>
//   after it: what the stored results now say against HEAD's, the claims
//   again, and the checked-in text again where the claims hold. Writes the
//   pull request's body to <dir>/body.md and each file to commit under
//   <dir>/files, and sets the step's `changed` and `claims` outputs. A rerun
//   that only restamped its date and commit is no change
// node monthly.ts publish <dir>
//   in a job with a token that can write: commits <dir>/files to the run's
//   branch, forced from the commit measured, and opens the pull request or
//   rewrites the open one's body
//
// MONTHLY_SUITES is what reproduce.ts ran, `size` or `all`, and
// MONTHLY_RUNNER the runner's label. publish reads GH_TOKEN, BASE_BRANCH,
// DEFAULT_BRANCH, RUN_URL and ARTIFACT_URL beside the runner's own variables
import { execFileSync, spawnSync } from "node:child_process"
import {
	appendFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
import {
	bodyOf,
	branchFor,
	errorOf,
	isMeaningful,
	leaderboardPath,
	title,
	unchangedSummary,
	type ClaimsCheck,
	type Derived,
	type FileChange,
	type Report,
	type Suites
} from "./monthlyReport.ts"

const here = import.meta.dirname
const repo = join(here, "..", "..", "..", "..")
const external = "ark/repo/bench/external"

// what a rerun measures: the leaderboard and the run behind it
// (reproduce.ts --newest), and the "smallest" preset's sizes (pnpm benchScale)
const dataPaths = [
	leaderboardPath,
	"ark/docs/lib/bench/presetScale.json",
	`${external}/results/newest`
]

// what writeMarkdown.ts writes that's checked in
const derivedPaths = [
	"ark/docs/public/llms.txt",
	"ark/docs/public/llms-full.txt",
	"ark/docs/public/docs",
	"ark/type/skills/arktype/references/migrating.md"
]

const [command, dir] = process.argv.slice(2)
if (!dir) throw new Error("node monthly.ts <baseline|report|publish> <dir>")

const git = (...args: string[]) =>
	execFileSync("git", args, {
		cwd: repo,
		encoding: "utf8",
		maxBuffer: 1 << 30
	})

// the tracked files under paths that differ from HEAD, and the untracked ones
// git doesn't ignore
const changedIn = (paths: string[]) => [
	...new Set(
		git("ls-files", "-m", "-o", "--exclude-standard", "-z", "--", ...paths)
			.split("\0")
			.filter(Boolean)
	)
]

const atHead = (path: string) => {
	const { status, stdout } = spawnSync("git", ["show", `HEAD:${path}`], {
		cwd: repo,
		encoding: "utf8",
		maxBuffer: 1 << 30
	})
	return status === 0 ? stdout : undefined
}

const inTree = (path: string) =>
	existsSync(join(repo, path)) ?
		readFileSync(join(repo, path), "utf8")
	:	undefined

const keep = (name: string, contents: string) => {
	const path = join(dir, name)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, contents)
}

const kept = (name: string) => readFileSync(join(dir, name), "utf8")

const checkClaims = (): ClaimsCheck => {
	const { status, stdout, stderr } = spawnSync(
		process.execPath,
		[join(repo, "ark/docs/lib/bench/headline.ts")],
		{ cwd: repo, encoding: "utf8" }
	)
	return status === 0 ?
			{ ok: true, output: stdout }
		:	{ ok: false, output: errorOf(stderr) }
}

// the docs build's Markdown, written as next.config.ts has it written. Whether
// it could be: claims.ts throws where the numbers don't back the copy
const writeDerived = () =>
	spawnSync(
		process.execPath,
		[
			"-e",
			`import(${JSON.stringify(pathToFileURL(join(repo, "ark/docs/lib/writeMarkdown.ts")).href)}).then(m => m.writeMarkdown())`
		],
		{ cwd: repo, stdio: ["ignore", "inherit", "inherit"] }
	).status === 0

const restoreDerived = () => {
	git("checkout", "--", ...derivedPaths)
	git("clean", "-fdq", "--", ...derivedPaths)
}

// the checked-in text can already trail its sources at the commit measured.
// What writing it there changes isn't the numbers' doing, so it's kept to
// tell from what they change
const baseline = () => {
	rmSync(join(dir, "derivedBaseline"), { recursive: true, force: true })
	const claims = checkClaims()
	keep("claimsBefore.json", JSON.stringify(claims))
	if (!claims.ok || !writeDerived()) return restoreDerived()
	for (const path of changedIn(derivedPaths))
		keep(join("derivedBaseline", path), inTree(path) ?? "")
	restoreDerived()
}

// writes the checked-in text from the new numbers and keeps each file they
// changed: one that reads as it did at the baseline is restored
const derive = (claims: ClaimsCheck): Derived => {
	if (!claims.ok) {
		restoreDerived()
		return {
			regenerated: [],
			skipped:
				"Not written again: the docs build writes `llms.txt` and its like from `claims.ts`, which throws. Once its copy holds, `pnpm buildDocs` writes them."
		}
	}
	if (!writeDerived()) {
		restoreDerived()
		return {
			regenerated: [],
			skipped:
				"Not written again: `ark/docs/lib/writeMarkdown.ts` failed in the run. `pnpm buildDocs` writes them."
		}
	}
	const baselineOf = (path: string) => join(dir, "derivedBaseline", path)
	const regenerated = changedIn(derivedPaths).filter(path => {
		const unmoved =
			existsSync(baselineOf(path)) &&
			readFileSync(baselineOf(path), "utf8") === (inTree(path) ?? "")
		if (unmoved) git("checkout", "--", path)
		return !unmoved
	})
	return {
		regenerated,
		stale: regenerated.filter(path => existsSync(baselineOf(path)))
	}
}

const standings = (env: Record<string, string>) => {
	const { status, stdout, stderr } = spawnSync(
		process.execPath,
		[join(here, "standings.ts")],
		{ cwd: repo, encoding: "utf8", env: { ...process.env, ...env } }
	)
	return status === 0 ? stdout : errorOf(stderr)
}

const output = (name: string, value: string) => {
	console.log(`${name}=${value}`)
	if (process.env.GITHUB_OUTPUT)
		appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
}

const report = () => {
	const claimsBefore: ClaimsCheck = JSON.parse(kept("claimsBefore.json"))
	const claimsAfter = checkClaims()
	const data = changedIn(dataPaths)
	const files = data.map(
		(path): FileChange => ({
			path,
			before: atHead(path),
			after: inTree(path)
		})
	)
	const changed = isMeaningful(files)
	const derived = changed ? derive(claimsAfter) : { regenerated: [] }

	// the leaderboard at HEAD, for standings.ts to rank as it ranks a fresh one
	const before = atHead(leaderboardPath)
	if (before !== undefined) keep("before/leaderboard.json", before)
	const base = process.env.BASE_BRANCH ?? git("branch", "--show-current").trim()
	const result: Report = {
		date: new Date().toISOString().slice(0, 10),
		commit: git("rev-parse", "--short=9", "HEAD").trim(),
		base,
		branch: branchFor(base, process.env.DEFAULT_BRANCH ?? "main"),
		suites: (process.env.MONTHLY_SUITES ?? "size") as Suites,
		runner: process.env.MONTHLY_RUNNER ?? "this machine",
		claimsBefore,
		claimsAfter,
		files,
		derived,
		standings:
			before === undefined ? undefined : (
				{
					before: standings({ LEADERBOARD_FRESH: join(dir, "before") }),
					after: standings({})
				}
			)
	}

	const text = changed ? bodyOf(result) : unchangedSummary(result)
	keep("claimsAfter.json", JSON.stringify(claimsAfter))
	if (result.standings) keep("standings.txt", result.standings.after)
	rmSync(join(dir, "files"), { recursive: true, force: true })
	if (changed) {
		keep("body.md", `${text}\n`)
		for (const path of [...data, ...derived.regenerated]) {
			if (existsSync(join(repo, path)))
				cpSync(join(repo, path), join(dir, "files", path))
		}
	}
	if (process.env.GITHUB_STEP_SUMMARY)
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`)
	else console.log(text)

	if (!claimsAfter.ok) {
		console.log(
			`::warning title=A claim no longer holds::${claimsAfter.output.split("\n")[0].slice(0, 300)}`
		)
	}
	output("changed", String(changed))
	output("claims", claimsAfter.ok ? "hold" : "fail")
}

const filesIn = (root: string, under = ""): string[] =>
	readdirSync(join(root, under), { withFileTypes: true }).flatMap(entry => {
		const path = under ? `${under}/${entry.name}` : entry.name
		return entry.isDirectory() ? filesIn(root, path) : [path]
	})

const env = (name: string) => {
	const value = process.env[name]
	if (!value) throw new Error(`publish needs ${name}`)
	return value
}

const gh = (...args: string[]) => {
	const { status, stdout, stderr } = spawnSync("gh", args, {
		cwd: repo,
		encoding: "utf8"
	})
	return { ok: status === 0, stdout: stdout.trim(), stderr: stderr.trim() }
}

const fail = (message: string): never => {
	console.log(`::error title=${title}::${message.replaceAll("\n", "%0A")}`)
	process.exit(1)
}

const publish = () => {
	const repository = env("GITHUB_REPOSITORY")
	const base = env("BASE_BRANCH")
	const branch = branchFor(base, env("DEFAULT_BRANCH"))
	const root = join(dir, "files")

	// the artifact comes from a job that installed and ran every rival's newest
	// release, so only the files a rerun writes are taken from it
	const paths = existsSync(root) ? filesIn(root) : []
	const allowed = [...dataPaths, ...derivedPaths]
	const stray = paths.filter(
		path => !allowed.some(to => path === to || path.startsWith(`${to}/`))
	)
	if (stray.length)
		fail(`The run's artifact holds files a rerun doesn't write: ${stray}`)

	git("switch", "-C", branch)
	for (const path of paths) {
		mkdirSync(dirname(join(repo, path)), { recursive: true })
		cpSync(join(root, path), join(repo, path))
	}
	if (paths.length) git("add", "--", ...paths)
	if (!git("diff", "--cached", "--name-only").trim()) {
		console.log("The run's files are the branch's: nothing to commit.")
		return
	}
	const commit = git("rev-parse", "--short=9", "HEAD").trim()
	git(
		"-c",
		"user.name=github-actions[bot]",
		"-c",
		"user.email=41898282+github-actions[bot]@users.noreply.github.com",
		"commit",
		"-m",
		`${title}, measured ${new Date().toISOString().slice(0, 10)} at ${commit}`,
		"-m",
		`Written by .github/workflows/leaderboard.yml's rerun of the benchmarks a hosted runner measures, with each rival at its newest release: ${env("RUN_URL")}. Its pull request says what changed.`
	)
	git("push", "--force", "origin", `HEAD:refs/heads/${branch}`)

	const body = join(dir, "pr.md")
	writeFileSync(
		body,
		`${kept("body.md")}\n---\n\n[The run](${env("RUN_URL")}), with every file it wrote as [its \`leaderboard\` artifact](${env("ARTIFACT_URL")}).\n`
	)
	const pulls = `repos/${repository}/pulls`
	const open = gh(
		"api",
		"--method",
		"GET",
		pulls,
		"-f",
		"state=open",
		"-f",
		`head=${repository.split("/")[0]}:${branch}`,
		"-f",
		`base=${base}`,
		"--jq",
		".[0].number // empty"
	)
	if (!open.ok) fail(`Couldn't list the open pull requests: ${open.stderr}`)

	const fields = ["-f", `title=${title}`, "-F", `body=@${body}`]
	const written =
		open.stdout ?
			gh(
				"api",
				"--method",
				"PATCH",
				`${pulls}/${open.stdout}`,
				...fields,
				"--jq",
				".html_url"
			)
		:	gh(
				"api",
				"--method",
				"POST",
				pulls,
				...fields,
				"-f",
				`head=${branch}`,
				"-f",
				`base=${base}`,
				"--jq",
				".html_url"
			)
	if (written.ok) {
		console.log(
			`${open.stdout ? "Updated" : "Opened"} ${written.stdout || `#${open.stdout}`}`
		)
		return
	}
	const compare = `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${repository}/compare/${base}...${branch}?expand=1`
	fail(
		/not permitted to create/i.test(`${written.stdout}\n${written.stderr}`) ?
			`GitHub refused to open the pull request because the repository setting "Allow GitHub Actions to create and approve pull requests" is off. Turn it on under Settings > Actions > General > Workflow permissions and run this again, or open it by hand from the branch this run pushed: ${compare}\n${written.stderr}`
		:	`Couldn't ${open.stdout ? `update #${open.stdout}` : "open the pull request"}. If the repository setting "Allow GitHub Actions to create and approve pull requests" (Settings > Actions > General > Workflow permissions) is off, turn it on. The branch is pushed: ${compare}\n${written.stdout}\n${written.stderr}`
	)
}

if (command === "baseline") baseline()
else if (command === "report") report()
else if (command === "publish") publish()
else throw new Error(`Unknown command ${command}: baseline, report or publish`)
