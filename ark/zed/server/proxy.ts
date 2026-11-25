import type { Readable, Writable } from "node:stream"
import {
	restoreDiagnostic,
	summarizeDiagnostic,
	type LspDiagnostic
} from "./diagnostics.ts"

export type LspMessage = {
	jsonrpc: "2.0"
	id?: number | string | null
	method?: string
	params?: any
	result?: any
	error?: unknown
}

export type MessageHandler = (body: string, frame: Buffer) => void

/** Calls `onMessage` with each Language Server Protocol message's body. */
export const readMessages = (
	stream: Readable,
	onMessage: MessageHandler
): void => {
	let buffered: Buffer = Buffer.alloc(0)
	stream.on("data", (chunk: Buffer) => {
		buffered = buffered.length ? Buffer.concat([buffered, chunk]) : chunk
		while (true) {
			const headerEnd = buffered.indexOf("\r\n\r\n")
			if (headerEnd === -1) return
			const header = buffered.subarray(0, headerEnd).toString("ascii")
			const contentLength = /content-length:\s*(\d+)/i.exec(header)
			if (!contentLength) {
				throw new Error(
					`Language server message has no Content-Length: ${header}`
				)
			}
			const bodyStart = headerEnd + 4
			const bodyEnd = bodyStart + Number(contentLength[1])
			if (buffered.length < bodyEnd) return
			const frame = buffered.subarray(0, bodyEnd)
			buffered = buffered.subarray(bodyEnd)
			onMessage(frame.subarray(bodyStart).toString("utf8"), frame)
		}
	})
}

export const encodeMessage = (message: LspMessage): Buffer => {
	const body = Buffer.from(JSON.stringify(message), "utf8")
	return Buffer.concat([
		Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "ascii"),
		body
	])
}

export type ProxyStreams = {
	/** what the editor sends */
	clientIn: Readable
	/** what the editor receives */
	clientOut: Writable
	/** what the language server receives */
	serverIn: Writable
	/** what the language server sends */
	serverOut: Readable
}

const pullDiagnosticMethods = new Set([
	"textDocument/diagnostic",
	"workspace/diagnostic"
])

// only messages that might be rewritten are parsed, so completion lists and
// the like pass through as the bytes the server wrote
const mayCarryDiagnostics =
	/"method"\s*:\s*"(?:textDocument\/(?:diagnostic|codeAction|publishDiagnostics)|workspace\/diagnostic)"/

/**
 * Relays messages between an editor and a TypeScript language server,
 * summarizing each diagnostic the way ErrorLens does in VS Code: the summary
 * becomes the message's first line, which is all Zed shows inline.
 */
export const connectProxy = ({
	clientIn,
	clientOut,
	serverIn,
	serverOut
}: ProxyStreams): void => {
	const pendingPulls = new Set<LspMessage["id"]>()

	readMessages(clientIn, (body, frame) => {
		if (!mayCarryDiagnostics.test(body)) return serverIn.write(frame)
		const message: LspMessage = JSON.parse(body)
		if (pullDiagnosticMethods.has(message.method!)) {
			pendingPulls.add(message.id)
			return serverIn.write(frame)
		}
		// diagnostics the editor sends back, as with a code action's context,
		// go to the server as it wrote them
		const diagnostics: LspDiagnostic[] | undefined =
			message.params?.context?.diagnostics
		if (!diagnostics) return serverIn.write(frame)
		message.params.context.diagnostics = diagnostics.map(restoreDiagnostic)
		serverIn.write(encodeMessage(message))
	})

	readMessages(serverOut, (body, frame) => {
		const isPush = mayCarryDiagnostics.test(body)
		if (!isPush && !pendingPulls.size) return clientOut.write(frame)
		const message: LspMessage = JSON.parse(body)
		if (message.method === "textDocument/publishDiagnostics") {
			message.params.diagnostics =
				message.params.diagnostics.map(summarizeDiagnostic)
			return clientOut.write(encodeMessage(message))
		}
		if (message.method !== undefined || !pendingPulls.has(message.id))
			return clientOut.write(frame)
		pendingPulls.delete(message.id)
		if (message.result) summarizeReport(message.result)
		clientOut.write(encodeMessage(message))
	})
}

type DiagnosticReport = {
	kind?: "full" | "unchanged"
	items?: LspDiagnostic[]
	relatedDocuments?: Record<string, DiagnosticReport>
}

/**
 * Summarizes a pull diagnostic report in place, whether a document's
 * (`textDocument/diagnostic`) or the workspace's (`workspace/diagnostic`).
 */
const summarizeReport = (report: DiagnosticReport) => {
	if (report.kind === "full" && report.items)
		report.items = report.items.map(summarizeDiagnostic)
	if (report.relatedDocuments) {
		for (const related of Object.values(report.relatedDocuments))
			summarizeReport(related)
	}
	// a workspace report lists a report per document
	if (!report.kind && report.items) {
		for (const documentReport of report.items as DiagnosticReport[])
			summarizeReport(documentReport)
	}
}
