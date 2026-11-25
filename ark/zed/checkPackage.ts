/**
 * Packages this extension the way the Zed extension registry does, with its
 * own `zed-extension` CLI in Docker, so a manifest, Rust or grammar error
 * shows up before the registry PR does.
 *
 * node ark/zed/checkPackage.ts [--grammar <tree-sitter grammar dir>]
 *
 * The grammar defaults to ark/tree-sitter as it is in the working tree,
 * committed to a scratch repository the manifest points at.
 */
import { execFileSync } from "node:child_process"
import {
	cpSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parseArgs } from "node:util"

// .github/workflows/ci.yml in zed-industries/extensions
const zedExtensionCliSha = "9ee3c503a4bbbc6b4a0f8a789acca4871d773223"
const rustToolchain = "1.90"
const image = `ark-zed-extension-cli:${zedExtensionCliSha.slice(0, 12)}`

const extensionDir = import.meta.dirname
const { values } = parseArgs({
	options: {
		grammar: {
			type: "string",
			default: join(extensionDir, "..", "tree-sitter")
		}
	}
})

const run = (command: string, args: string[], cwd?: string) =>
	execFileSync(command, args, { cwd, stdio: "inherit" })

const imageExists = () => {
	try {
		execFileSync("docker", ["image", "inspect", image], { stdio: "ignore" })
		return true
	} catch {
		return false
	}
}

if (!imageExists()) {
	execFileSync(
		"docker",
		["build", "--platform", "linux/amd64", "-t", image, "-"],
		{
			input: `FROM --platform=linux/amd64 rust:${rustToolchain}-bookworm
RUN rustup target add wasm32-wasip2 && apt-get update && apt-get install -y --no-install-recommends git wget ca-certificates && rm -rf /var/lib/apt/lists/*
RUN wget --quiet "https://zed-extension-cli.nyc3.digitaloceanspaces.com/${zedExtensionCliSha}/x86_64-unknown-linux-gnu/zed-extension" -O /usr/local/bin/zed-extension && chmod +x /usr/local/bin/zed-extension
`,
			stdio: ["pipe", "inherit", "inherit"]
		}
	)
}

const work = mkdtempSync(join(tmpdir(), "ark-zed-package-"))
try {
	const source = join(work, "source")
	cpSync(extensionDir, source, {
		recursive: true,
		filter: path =>
			!/[/\\](node_modules|target|grammars|temp)([/\\]|$)/.test(path)
	})

	// the registry clones the grammar at `rev`, so give it one to clone
	const grammarRepo = join(work, "grammar")
	cpSync(values.grammar, join(grammarRepo, "ark", "tree-sitter"), {
		recursive: true,
		filter: path => !/[/\\](node_modules|\.git)([/\\]|$)/.test(path)
	})
	run("git", ["init", "--quiet"], grammarRepo)
	run("git", ["add", "."], grammarRepo)
	run(
		"git",
		[
			"-c",
			"user.name=checkPackage",
			"-c",
			"user.email=checkPackage@localhost",
			"commit",
			"--quiet",
			"-m",
			"grammar"
		],
		grammarRepo
	)
	const rev = execFileSync("git", ["rev-parse", "HEAD"], { cwd: grammarRepo })
		.toString()
		.trim()

	const manifestPath = join(source, "extension.toml")
	const manifest = readFileSync(manifestPath, "utf8")
		.replace(
			/(\[grammars\.arktype][^[]*?repository = )"[^"]*"/,
			'$1"file:///work/grammar"'
		)
		.replace(/(\[grammars\.arktype][^[]*?rev = )"[^"]*"/, `$1"${rev}"`)
	writeFileSync(manifestPath, manifest)

	run("docker", [
		"run",
		"--rm",
		"--platform",
		"linux/amd64",
		"-v",
		`${work}:/work`,
		"-v",
		"ark-zed-cargo-registry:/usr/local/cargo/registry",
		image,
		"sh",
		"-c",
		// the registry's own invocation (src/package-extensions.js)
		"git config --global --add safe.directory '*' && zed-extension --scratch-dir /work/scratch --source-dir /work/source --output-dir /work/out"
	])

	const packaged = JSON.parse(
		readFileSync(join(work, "out", "manifest.json"), "utf8")
	)
	console.log(JSON.stringify(packaged, null, 2))
} finally {
	rmSync(work, { recursive: true, force: true })
}
