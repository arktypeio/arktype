import { arkKind } from "@ark/util"
import { namesTraversalError } from "./issueFeatures.ts"
import type { ArkIssue } from "./issues.ts"
import { lineOf } from "./issuesUndetailed.ts"

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
		for (const issue of this._) {
			issue.expected ??= "valid"
			issue.message ??= "is invalid"
		}
		return (this._ as IssuesWithToJson).toJSON ?
				this._
			:	Object.defineProperty(this._, "toJSON", issuesToJson)
	}

	get summary(): string {
		return this._.reduce(
			(summary, issue) => summary + (summary && "\n") + lineOf(issue),
			""
		)
	}

	summaryIn(): string {
		return this.summary
	}

	// as issues.ts's: constructed by TraversalError wherever its bundle keeps
	// the class, and otherwise an Error with the same name, message and errors
	throw(): never {
		if (namesTraversalError) throw new ThrownErrors(this)
		if (definedThrown) throw new definedThrown(this)
		const thrown = Error(this.summary)
		thrown.name = "TraversalError"
		throw Object.defineProperty(thrown, "arkErrors", { value: this })
	}

	// what it says and where, never its data, which may be private, a bigint
	// or circular
	toJSON(): readonly object[] {
		return this.issues.map(jsonIssueOf)
	}

	toString(): string {
		return this.summary
	}

	[Symbol.iterator](): IterableIterator<ArkIssue> {
		return this.issues[Symbol.iterator]()
	}
}

export { ArkErrors as FirstIssues }

type IssuesWithToJson = ArkIssue[] & { toJSON?: () => readonly object[] }

const jsonIssueOf = ({ code, path, expected, message }: ArkIssue): object => ({
	code,
	path: path.map(k => (typeof k === "symbol" ? String(k) : k)),
	...(expected !== undefined && { expected }),
	message
})

const issuesToJson: PropertyDescriptor & ThisType<readonly ArkIssue[]> = {
	value() {
		return this.map(jsonIssueOf)
	},
	writable: true,
	configurable: true
}

interface ThrownErrors extends Error {
	readonly name: "TraversalError"
	arkErrors: ArkErrors
}

// as issues.ts's, defined as its module loads and dropped where nothing
// imports it
let definedThrown: (new (errors: ArkErrors) => ThrownErrors) | undefined

const ThrownErrors: new (errors: ArkErrors) => ThrownErrors =
	/* @__PURE__ */ (() =>
		(definedThrown = class TraversalError extends Error {
			declare readonly name: "TraversalError"
			declare arkErrors: ArkErrors

			constructor(errors: ArkErrors) {
				super(errors.summary)

				// assigned, as a field's initializer compiles where the class is defined
				this.name = "TraversalError"
				// defined, so it's neither enumerable nor writable
				Object.defineProperty(this, "arkErrors", { value: errors })
			}
		}))()

export { ThrownErrors as TraversalError }
