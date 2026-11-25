import { attest, contextualize } from "@ark/attest"
import { PassThrough } from "node:stream"
import {
	connectProxy,
	encodeMessage,
	readMessages,
	type LspMessage
} from "@ark/zed/internal/server/proxy.ts"

const assignabilityError = `Argument of type '"number | strin"' is not assignable to parameter of type '"number | string"'.`

const summarized = `"number | string"\n${assignabilityError}`

const diagnostic = (message: string) => ({
	range: {
		start: { line: 0, character: 5 },
		end: { line: 0, character: 21 }
	},
	severity: 1,
	code: 2345,
	source: "ts",
	message
})

type Side = {
	write: (message: LspMessage | Buffer) => void
	received: () => Promise<LspMessage>
	frames: Buffer[]
}

const side = (input: PassThrough, output: PassThrough): Side => {
	const queue: LspMessage[] = []
	const waiting: ((message: LspMessage) => void)[] = []
	const frames: Buffer[] = []
	readMessages(output, (body, frame) => {
		frames.push(Buffer.from(frame))
		const message = JSON.parse(body)
		const resolve = waiting.shift()
		if (resolve) resolve(message)
		else queue.push(message)
	})
	return {
		write: message =>
			input.write(Buffer.isBuffer(message) ? message : encodeMessage(message)),
		received: () =>
			queue.length ?
				Promise.resolve(queue.shift()!)
			:	new Promise(resolve => waiting.push(resolve)),
		frames
	}
}

const setup = () => {
	const streams = {
		clientIn: new PassThrough(),
		clientOut: new PassThrough(),
		serverIn: new PassThrough(),
		serverOut: new PassThrough()
	}
	connectProxy(streams)
	return {
		client: side(streams.clientIn, streams.clientOut),
		server: side(streams.serverOut, streams.serverIn)
	}
}

contextualize(() => {
	it("summarizes pushed diagnostics", async () => {
		const { client, server } = setup()
		server.write({
			jsonrpc: "2.0",
			method: "textDocument/publishDiagnostics",
			params: {
				uri: "file:///a.ts",
				diagnostics: [
					diagnostic(assignabilityError),
					diagnostic("Cannot find name 'foo'.")
				]
			}
		})
		const { params } = await client.received()
		attest(params.diagnostics.map((d: any) => d.message)).equals([
			summarized,
			"Cannot find name 'foo'."
		])
		// everything but the message is the server's
		attest(params.diagnostics[0]).equals({
			...diagnostic(assignabilityError),
			message: summarized
		})
	})

	it("summarizes pulled diagnostics", async () => {
		const { client, server } = setup()
		client.write({
			jsonrpc: "2.0",
			id: 7,
			method: "textDocument/diagnostic",
			params: { textDocument: { uri: "file:///a.ts" } }
		})
		attest((await server.received()).id).equals(7)
		server.write({
			jsonrpc: "2.0",
			id: 7,
			result: {
				kind: "full",
				items: [diagnostic(assignabilityError)],
				relatedDocuments: {
					"file:///b.ts": {
						kind: "full",
						items: [diagnostic(assignabilityError)]
					}
				}
			}
		})
		const { result } = await client.received()
		attest(result.items[0].message).equals(summarized)
		attest(result.relatedDocuments["file:///b.ts"].items[0].message).equals(
			summarized
		)
	})

	it("summarizes workspace diagnostics", async () => {
		const { client, server } = setup()
		client.write({
			jsonrpc: "2.0",
			id: "w",
			method: "workspace/diagnostic",
			params: { previousResultIds: [] }
		})
		await server.received()
		server.write({
			jsonrpc: "2.0",
			id: "w",
			result: {
				items: [
					{
						uri: "file:///a.ts",
						kind: "full",
						items: [diagnostic(assignabilityError)]
					},
					{ uri: "file:///b.ts", kind: "unchanged", resultId: "1" }
				]
			}
		})
		const { result } = await client.received()
		attest(result.items[0].items[0].message).equals(summarized)
		attest(result.items[1]).equals({
			uri: "file:///b.ts",
			kind: "unchanged",
			resultId: "1"
		})
	})

	it("gives code actions the diagnostics the server sent", async () => {
		const { client, server } = setup()
		client.write({
			jsonrpc: "2.0",
			id: 3,
			method: "textDocument/codeAction",
			params: {
				textDocument: { uri: "file:///a.ts" },
				range: diagnostic("").range,
				context: { diagnostics: [diagnostic(summarized)] }
			}
		})
		const { params } = await server.received()
		attest(params.context.diagnostics[0].message).equals(assignabilityError)
	})

	it("passes everything else through byte for byte", async () => {
		const { client, server } = setup()
		const completion = Buffer.from(
			encodeMessage({
				jsonrpc: "2.0",
				id: 9,
				result: { items: [{ label: "string ✓", detail: '"string"' }] }
			})
		)
		// split mid-header and mid-body, inside a multibyte character
		const checkmark = completion.indexOf("✓")
		server.write(completion.subarray(0, 10))
		server.write(completion.subarray(10, checkmark + 1))
		server.write(completion.subarray(checkmark + 1))
		await client.received()
		attest(client.frames[0].equals(completion)).equals(true)
	})
})
