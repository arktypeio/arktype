import type { ResolvedConfig } from "../config.ts"
import {
	ArkErrors,
	ArkTraversal,
	errorOfIssue,
	type ArkError
} from "./errors.ts"
import { $ark } from "./registry.ts"
import { rootApplyRuntime } from "./rootApply.ts"
import { Traversal, type FailHandler } from "./traversal.ts"

// errors "first" stops at the first issue, dropping any added after it
export class ArkFirstIssueTraversal extends ArkTraversal {
	override get failFast(): boolean {
		return true
	}

	override finalize(onFail?: FailHandler | null): unknown {
		this._errors?._.splice(1)
		return super.finalize(onFail)
	}
}

/**
 * The errors a Type configured with `errors: "none"` returns: one issue at
 * the root, whose message is `is invalid`.
 */
export class UndetailedErrors extends ArkErrors {
	override get issues(): readonly ArkError[] {
		for (const issue of this._) issue.message ??= "is invalid"
		return this._
	}

	override get summary(): string {
		return this.issues.map(issue => issue.message).join("\n")
	}

	override toLocaleString(): string {
		return this.summary
	}

	// arktype's grouped issues, which merging reads
	override get _issues(): ArkError[] {
		return this.issues.map(issue =>
			errorOfIssue(issue, [], $ark.resolvedConfig!)
		)
	}
}

// errors "none" fails a root with one issue, whatever ctx added
export class UndetailedTraversal extends Traversal {
	override createErrors(): UndetailedErrors {
		return new UndetailedErrors(this.config)
	}

	// a root apply finalizes it only once data is invalid
	override finalize(onFail?: FailHandler | null): unknown {
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
	errors._ = [{ code: "predicate", path: [], data } as never]
	return onFail ? onFail(errors as never) : errors
}

$ark.errorModes = {
	first: { ...rootApplyRuntime, Traversal: ArkFirstIssueTraversal },
	none: {
		...rootApplyRuntime,
		Traversal: UndetailedTraversal,
		applyCyclic: (node: unknown, data: unknown, ctx: never) => ctx,
		applyRejected: rejectUndetailed
	} as never
}
