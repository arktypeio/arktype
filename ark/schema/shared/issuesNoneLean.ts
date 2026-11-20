import { namesTraversalError } from "./issueFeatures.ts"
import type { ArkIssue } from "./issues.ts"
import { lineOf, TraversalError } from "./issuesUndetailed.ts"

export * from "./issuesUndetailed.ts"

// in place of issuesNone.ts's errors, written for size
export class ArkErrors {
	_: ArkIssue[] = []

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

	// as issuesNone.ts's
	throw(): never {
		if (namesTraversalError) throw new TraversalError(this as never)
		const thrown = Error(this.summary)
		thrown.name = "TraversalError"
		throw Object.defineProperty(thrown, "arkErrors", { value: this })
	}

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
