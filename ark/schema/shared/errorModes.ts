import type { ResolvedConfig } from "../config.ts"
import {
	ArkErrors,
	ArkTraversal,
	invalidError,
	isArkError,
	SiteTraversal,
	type ArkError
} from "./errors.ts"
import { findsOnRead } from "./issueFeatures.ts"
import { lineOf } from "./issues.ts"
import { $ark } from "./registry.ts"
import { rootApplyRuntime, type RootApplyRuntime } from "./rootApply.ts"
import type { FailHandler } from "./traversal.ts"

// errors "first" stops at the first issue, dropping any added after it
export class ArkFirstIssueTraversal extends ArkTraversal {
	override get failFast(): boolean {
		return true
	}

	override fin(onFail?: FailHandler | null): unknown {
		const errors = this._errors as ArkErrors | undefined
		if (errors && errors._.length > 1) {
			errors._.length = 1
			// a callback reading ctx.errors grouped those dropped
			errors._init(this.config)
		}
		return super.fin(onFail)
	}
}

/**
 * The errors a Type configured with `errors: "none"` returns: one issue at
 * the root, whose message is `is invalid`.
 */
export class UndetailedErrors extends ArkErrors {
	// written once read, with every field an error has
	override get issues(): readonly ArkError[] {
		const issues = this._
		for (let i = 0; i < issues.length; i++)
			if (!isArkError(issues[i])) issues[i] = invalidError(issues[i], $ark.cfg!)

		return issues
	}

	override get _first(): ArkError | undefined {
		return this.issues[0]
	}

	// an issue ctx added below the root is named by its path, as any is
	override get summary(): string {
		return this._.reduce(
			(summary, issue) => summary + (summary && "\n") + lineOf(issue),
			""
		)
	}

	override toLocaleString(): string {
		return this.summary
	}

	// arktype's grouped issues, which merging reads
	override get _i(): ArkError[] {
		return this.issues as ArkError[]
	}
}

// errors "none" fails a root with one issue, whatever ctx added
export class UndetailedTraversal extends SiteTraversal {
	override createErrors(): UndetailedErrors {
		return new UndetailedErrors(this.config)
	}

	// a root apply finalizes it only once data is invalid
	override fin(onFail?: FailHandler | null): unknown {
		return rejectUndetailed(null, this.root, this.config, onFail)
	}
}

const undetailedPrototype = UndetailedErrors.prototype

// errors "none" in place of applyRejected; node is unused
export const rejectUndetailed = (
	node: unknown,
	data: unknown,
	config: ResolvedConfig,
	onFail: FailHandler | null | undefined
): unknown => {
	// no constructor: one root issue needs none of its fields
	const errors: UndetailedErrors = Object.create(undetailedPrototype)
	const issues: UndetailedErrors["_"] = [
		{ code: "predicate", path: [], data } as never
	]
	// the field a getter reads, where a build wrote errors to find their
	// issues once read
	if (findsOnRead) (errors as {} as { _f: unknown })._f = issues
	else errors._ = issues
	return onFail ? onFail(errors as never) : errors
}

export const errorModes: Record<"first" | "none", RootApplyRuntime> = {
	first: { ...rootApplyRuntime, Traversal: ArkFirstIssueTraversal },
	none: {
		...rootApplyRuntime,
		Traversal: UndetailedTraversal,
		applyCyclic: (node: unknown, data: unknown, ctx: never) => ctx,
		applyRejected: rejectUndetailed
	} as never
}
