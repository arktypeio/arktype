import { attest, contextualize } from "@ark/attest"
import { spawn } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
	originalMessage,
	summarizeMessage
} from "@ark/zed/internal/server/diagnostics.ts"
import {
	encodeMessage,
	readMessages,
	type LspMessage
} from "@ark/zed/internal/server/proxy.ts"

const main = fileURLToPath(
	import.meta.resolve("@ark/zed/internal/server/main.ts")
)
const vtsls = fileURLToPath(
	import.meta.resolve("@vtsls/language-server/bin/vtsls.js")
)

/** what src/arktype.rs adds to vtsls's configuration */
const autoImportExclude = {
	typescript: {
		preferences: { autoImportSpecifierExcludeRegexes: ["^(node:)?os$"] }
	}
}

type SessionOptions = {
	source: string
	/** what vtsls gets when it asks for its configuration */
	configuration?: Record<string, unknown>
}

type Session = {
	uri: string
	request: (method: string, params: unknown) => Promise<any>
	/** the first notification `matches` accepts, including ones already in */
	notification: (matches: (message: LspMessage) => boolean) => Promise<any>
	close: () => void
}

/**
 * Starts the proxy in front of vtsls, as Zed does, with `source` open in a
 * project inside this package, so `arktype` resolves to this repo's.
 */
const startSession = async ({
	source,
	configuration = {}
}: SessionOptions): Promise<Session> => {
	const project = new URL(
		`temp/vtsls-${process.pid}-${Math.random().toString(36).slice(2)}/`,
		import.meta.url
	)
	mkdirSync(project, { recursive: true })
	writeFileSync(
		new URL("tsconfig.json", project),
		JSON.stringify({
			compilerOptions: {
				module: "NodeNext",
				strict: true,
				noEmit: true,
				skipLibCheck: true,
				customConditions: ["ark-ts"]
			},
			include: ["*.ts"]
		})
	)
	const file = new URL("main.ts", project)
	writeFileSync(file, source)

	const server = spawn(
		process.execPath,
		["--experimental-strip-types", main, vtsls, "--stdio"],
		{ cwd: fileURLToPath(project), stdio: ["pipe", "pipe", "ignore"] }
	)
	const send = (message: Omit<LspMessage, "jsonrpc">) =>
		server.stdin.write(encodeMessage({ jsonrpc: "2.0", ...message }))

	let nextId = 1
	const pending = new Map<LspMessage["id"], (result: unknown) => void>()
	const notifications: LspMessage[] = []
	const waiting: {
		matches: (message: LspMessage) => boolean
		resolve: (params: unknown) => void
	}[] = []

	readMessages(server.stdout, body => {
		const message: LspMessage = JSON.parse(body)
		if (message.method && message.id !== undefined) {
			// a request from the server
			return send({
				id: message.id,
				result:
					message.method === "workspace/configuration" ?
						// vtsls asks for all of it, as section ""
						message.params.items.map(({ section }: { section?: string }) =>
							section ? (configuration[section] ?? null) : configuration
						)
					:	null
			})
		}
		if (message.method) {
			const waiter = waiting.find(({ matches }) => matches(message))
			if (waiter) {
				waiting.splice(waiting.indexOf(waiter), 1)
				waiter.resolve(message.params)
			} else notifications.push(message)
			return
		}
		pending.get(message.id)?.(message.result)
		pending.delete(message.id)
	})

	const request = (method: string, params: unknown) =>
		new Promise<any>(resolve => {
			const id = nextId++
			pending.set(id, resolve)
			send({ id, method, params })
		})

	await request("initialize", {
		processId: process.pid,
		rootUri: project.href,
		capabilities: {
			workspace: { configuration: true },
			textDocument: {
				publishDiagnostics: {},
				completion: { completionItem: { labelDetailsSupport: true } }
			}
		}
	})
	send({ method: "initialized", params: {} })
	send({
		method: "textDocument/didOpen",
		params: {
			textDocument: {
				uri: file.href,
				languageId: "typescript",
				version: 1,
				text: source
			}
		}
	})

	return {
		uri: file.href,
		request,
		notification: matches => {
			const received = notifications.find(matches)
			if (received) return Promise.resolve(received.params)
			return new Promise(resolve => waiting.push({ matches, resolve }))
		},
		close: () => {
			server.kill()
			rmSync(project, { recursive: true, force: true })
		}
	}
}

/** where each `type` auto-import completion at the end of `source` imports from */
const typeImportSources = async (
	configuration: Record<string, unknown>
): Promise<string[]> => {
	const source = "export const T = typ"
	const session = await startSession({ source, configuration })
	try {
		// completions wait on the project, which diagnostics say has loaded
		await session.notification(
			message => message.method === "textDocument/publishDiagnostics"
		)
		const completions = await session.request("textDocument/completion", {
			textDocument: { uri: session.uri },
			position: { line: 0, character: source.length }
		})
		const items: { label: string; labelDetails?: { description?: string } }[] =
			Array.isArray(completions) ? completions : completions.items
		return items
			.filter(item => item.label === "type" && item.labelDetails?.description)
			.map(item => item.labelDetails!.description!)
			.sort()
	} finally {
		session.close()
	}
}

contextualize(() => {
	it("summarizes vtsls's diagnostics for ArkType definitions", async () => {
		const session = await startSession({
			source: `import { type } from "arktype"

export const Union = type("number | strin")

export const Unresolvable = type({ name: "strng" })

export const Ok = type("string")

export const notArk: number = "not a number"
`
		})
		try {
			const { diagnostics } = await session.notification(
				message =>
					message.method === "textDocument/publishDiagnostics" &&
					message.params.diagnostics.length === 3
			)
			const byLine: { line: number; message: string }[] = diagnostics
				.map((d: any) => ({ line: d.range.start.line, message: d.message }))
				.sort((a: any, b: any) => a.line - b.line)

			// what Zed shows inline: the first line, which ErrorLens shows in VS Code
			attest(byLine.map(({ message }) => message.split("\n")[0])).snap([
				'"number | string"',
				"'strng' is unresolvable​",
				"Type 'string' is not assignable to type 'number'."
			])

			// the rest is vtsls's own message, summarized exactly once
			for (const { message } of byLine)
				attest(summarizeMessage(originalMessage(message))).equals(message)
		} finally {
			session.close()
		}
	}).timeout(120_000)

	it("excludes os from auto-imports of type", async () => {
		attest(await typeImportSources({})).snap(["node:os", "os"])
		attest(await typeImportSources(autoImportExclude)).snap([])
	}).timeout(120_000)
})
