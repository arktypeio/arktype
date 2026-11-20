import { arkKind } from "@ark/util"
import { namesTraversalError } from "./issueFeatures.ts"
import type { ArkIssue } from "./issues.ts"
import { lineOf, TraversalError } from "./issuesUndetailed.ts"

export * from "./issuesUndetailed.ts"

// in place of issues.ts, so errors "none" ships nothing writing detail, with
// every member a detailed build's errors have. What they do is written here,
// as each name this module exports is one @ark/schema/internal must export
export class ArkErrors {
	_: ArkIssue[] = []

	get [arkKind](): "errors" {
		return "errors"
	}

	get count(): number {
		return this._.length
	}

	get issues(): readonly ArkIssue[] {
		return this._.reduce(
			(issues, issue) => ((issue.message ??= "is invalid"), issues),
			this._
		)
	}

	get summary(): string {
		return this._.reduce(
			(summary, issue) => summary + (summary && "\n") + lineOf(issue),
			""
		)
	}

	// as issues.ts's: constructed by TraversalError only where a program names
	// it, and otherwise an Error with the same name, message and errors
	throw(): never {
		if (namesTraversalError) throw new TraversalError(this)
		const thrown = Error(this.summary)
		thrown.name = "TraversalError"
		throw Object.defineProperty(thrown, "arkErrors", { value: this })
	}

	// what it says and where, never its data, which may be private, a bigint
	// or circular
	toJSON(): readonly object[] {
		return this.issues.map(({ code, path, message }) => ({
			code,
			path: path.map(k => (typeof k === "symbol" ? String(k) : k)),
			message
		}))
	}

	toString(): string {
		return this.summary
	}

	[Symbol.iterator](): IterableIterator<ArkIssue> {
		return this.issues[Symbol.iterator]()
	}
}

export { ArkErrors as FirstIssues }
