import type { Predicate } from "../predicate.ts"
import type { BaseRoot } from "../roots/root.ts"
import {
	ArkErrors,
	awaitSettledByErrors,
	loadingKey,
	type ArkErrorInput
} from "./errors.ts"
import { Traversal } from "./traversal.ts"

export type AsyncPredicate<data = any> = (
	data: data,
	ctx: Traversal
) => Promise<boolean>

type AsyncCheck = { id: number; check: AsyncPredicate }

type CheckResult = {
	valid: boolean
	errors: ArkErrorInput[]
	/** when the check settled, so errors are listed in the order they became known */
	order: number
}

type Check = { data: unknown; result?: CheckResult }

/** `settled` promises read while a root's result was loading, and how that wait ended */
type Wait = {
	settles: {
		resolve: (result: unknown) => void
		reject: (e: unknown) => void
	}[]
	outcome?: { result: unknown } | { error: unknown }
}

export type RootApply = (
	data: unknown,
	onFail: ArkErrors.Handler | null
) => unknown

/** the checks one consumer's latest validation used, by check and path */
type Session = {
	checks: Map<string, Check>
	used: Set<string>
	/** per root, the wait for its next result with nothing loading */
	waiting: Map<RootApply, Wait>
	onSettled: () => void
	/** `awaited` is whether a `settled` promise received the error */
	onFailed: (e: unknown, awaited: boolean) => void
	/** created for one direct call and stopped once its result has nothing loading */
	direct: boolean
	stopped: boolean
}

let current: Session | undefined
let nextCheckId = 0
let settledCount = 0

const createSession = (
	onSettled: () => void,
	onFailed: Session["onFailed"],
	direct: boolean
): Session => ({
	checks: new Map(),
	used: new Set(),
	waiting: new Map(),
	onSettled,
	onFailed,
	direct,
	stopped: false
})

const runIn = <result>(session: Session, validate: () => result): result => {
	const outer = current
	current = session
	session.used.clear()
	try {
		return validate()
	} finally {
		current = outer
		// checks for data or paths the latest run didn't reach are dropped
		for (const key of session.checks.keys())
			if (!session.used.has(key)) session.checks.delete(key)
	}
}

const end = (wait: Wait, outcome: NonNullable<Wait["outcome"]>) => {
	wait.outcome = outcome
	for (const { resolve, reject } of wait.settles) {
		if ("result" in outcome) resolve(outcome.result)
		else reject(outcome.error)
	}
	wait.settles = []
}

const stop = (session: Session) => {
	session.stopped = true
	session.checks.clear()
	session.waiting.clear()
}

export interface AsyncCheckTracker {
	/** runs `validate`, reusing the latest result of each `narrowAsync` check it reaches */
	run: <result>(validate: () => result) => result
	/** ignores every check still running */
	stop: () => void
}

/**
 * #### keep `narrowAsync` checks across validations, e.g. in a UI framework adapter
 *
 * ✅ `onSettled` is called when a check started by `run` settles, so the caller can run again
 * ✅ only the latest check for each value and path is kept, stale results are ignored
 * ⚠️ without `onFailed`, a check that throws rejects `settled`, or is rethrown if nothing awaited it
 */
export const trackAsyncChecks = (
	onSettled: () => void,
	onFailed?: (e: unknown) => void
): AsyncCheckTracker => {
	const session = createSession(onSettled, onFailed ?? rethrowUnawaited, false)
	return {
		run: validate => runIn(session, validate),
		stop: () => stop(session)
	}
}

/** an error nobody awaited through `settled` is rethrown so it isn't lost */
const rethrowUnawaited = (e: unknown, awaited: boolean) => {
	if (!awaited) throw e
}

/** wraps the apply of a root that includes `narrowAsync` checks so its errors can be awaited */
export const createAsyncRootApply = (apply: RootApply): RootApply => {
	const applyInSession: RootApply = (data, onFail) => {
		if (!current) {
			const session = createSession(
				() => runIn(session, () => applyInSession(data, null)),
				() => {},
				true
			)
			return runIn(session, () => applyInSession(data, onFail))
		}
		const session = current
		const result = apply(data, null)
		if (result instanceof ArkErrors && result.isLoading) {
			const wait = session.waiting.get(applyInSession) ?? { settles: [] }
			session.waiting.set(applyInSession, wait)
			let settled: Promise<unknown> | undefined
			awaitSettledByErrors.set(
				result,
				() =>
					(settled ??= new Promise((resolve, reject) => {
						const { outcome } = wait
						if (!outcome) wait.settles.push({ resolve, reject })
						else if ("result" in outcome) resolve(outcome.result)
						else reject(outcome.error)
					}))
			)
		} else {
			const wait = session.waiting.get(applyInSession)
			if (wait) {
				session.waiting.delete(applyInSession)
				end(wait, { result })
			}
			if (session.direct && session.waiting.size === 0) stop(session)
		}
		return result instanceof ArkErrors && onFail ? onFail(result) : result
	}
	return applyInSession
}

/** the result of `check` for `data` at `ctx`'s path, starting it if needed; undefined while it runs */
const resultOf = (
	session: Session,
	{ id, check }: AsyncCheck,
	data: unknown,
	ctx: Traversal
): CheckResult | undefined => {
	const key = `${id}:${ctx.propString}`
	session.used.add(key)
	const latest = session.checks.get(key)
	if (latest && latest.data === data) return latest.result
	const started: Check = { data }
	session.checks.set(key, started)
	const isLatest = () => !session.stopped && session.checks.get(key) === started
	// ctx moves on before the check settles, so the check gets its own at this path,
	// recording the errors it adds to replay them on the ctx of each run that reads the result
	const checkCtx = new Traversal(ctx.root, ctx.config)
	checkCtx.path = [...ctx.path]
	const errors: ArkErrorInput[] = []
	const addError = checkCtx.error.bind(checkCtx)
	checkCtx.error = ((input: ArkErrorInput) => {
		errors.push(input)
		return addError(input)
	}) as never
	check(data, checkCtx).then(
		valid => {
			if (!isLatest()) return
			started.result = { valid, errors, order: settledCount++ }
			session.onSettled()
		},
		e => {
			if (!isLatest()) return
			// the next run with this data starts the check again
			session.checks.delete(key)
			let awaited = false
			for (const wait of session.waiting.values()) {
				awaited ||= wait.settles.length > 0
				end(wait, { error: e })
			}
			session.waiting.clear()
			session.onFailed(e, awaited)
		}
	)
	return undefined
}

/** adds a predicate's default error if it returned `false` without adding one */
const failWith = (
	ctx: Traversal,
	meta: ArkEnv.meta,
	predicate: Function,
	valid: boolean,
	errorCount: number
): boolean => {
	if (ctx.currentErrorCount !== errorCount) return true
	if (valid) return false
	ctx.errorFromNodeContext({
		code: "predicate",
		description:
			meta.description ??
			`valid according to ${predicate.name || "an anonymous predicate"}`,
		meta
	})
	return true
}

type Chain = { base: BaseRoot; checks: (AsyncCheck | Predicate)[] }

/**
 * roots ending in `narrowAsync` checks and any `.narrow` after them,
 * which run together as one predicate on the root they were chained from
 */
const chains = new WeakMap<BaseRoot, Chain>()

const asyncPredicates = new WeakSet<Function>()

export const isAsyncPredicate = (predicate: Function): boolean =>
	asyncPredicates.has(predicate)

export const isAsyncChain = (root: BaseRoot): boolean => chains.has(root)

/**
 * `.narrow` stops at the first failure, so a check still running would hold back every check after it.
 * Consecutive `narrowAsync` checks and `.narrow` after them are one predicate instead: they all run,
 * async ones in parallel, and every failure known so far is reported.
 */
export const chainCheck = (
	root: BaseRoot,
	check: AsyncPredicate | Predicate,
	isAsync: boolean,
	narrow: (base: BaseRoot, predicate: Predicate) => BaseRoot
): BaseRoot => {
	const previous = chains.get(root)
	const base = previous?.base ?? root
	const checks = [
		...(previous?.checks ?? []),
		isAsync ?
			{ id: nextCheckId++, check: check as AsyncPredicate }
		:	(check as Predicate)
	]
	const predicate = (
		data: unknown,
		ctx: Traversal,
		meta: ArkEnv.meta = {}
	): boolean => {
		const session = current
		if (!session) {
			// e.g. `.allows`, which has no root call to run again: the data isn't known to pass yet
			ctx.isLoading = true
			return false
		}
		// sync checks first, then async ones in the order they settled,
		// so an error already reported never moves
		let failed = false
		let asyncCount = 0
		const settled: { check: AsyncCheck; result: CheckResult }[] = []
		for (const check of checks) {
			if (typeof check === "function") {
				const errorCount = ctx.currentErrorCount
				failed =
					failWith(ctx, meta, check, check(data, ctx), errorCount) || failed
				continue
			}
			asyncCount++
			const result = resultOf(session, check, data, ctx)
			if (result) settled.push({ check, result })
		}
		settled.sort((l, r) => l.result.order - r.result.order)
		for (const { check, result } of settled) {
			const errorCount = ctx.currentErrorCount
			for (const error of result.errors) ctx.error(error)
			failed =
				failWith(ctx, meta, check.check, result.valid, errorCount) || failed
		}
		const running = settled.length < asyncCount
		if (running) ctx.isLoading = true
		if (failed) return false
		if (running) {
			ctx.errorFromNodeContext({
				code: "predicate",
				description: "checked",
				meta: {
					problem: "is still being checked",
					...meta,
					[loadingKey]: true
				} as ArkEnv.meta
			})
			return false
		}
		return true
	}
	asyncPredicates.add(predicate)
	const narrowed = narrow(base, predicate)
	chains.set(narrowed, { base, checks })
	return narrowed
}
