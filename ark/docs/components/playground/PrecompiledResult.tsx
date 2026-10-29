"use client"

import type { Optimization } from "arktype/internal/standalone.ts"
import prettierPluginEstree from "prettier/plugins/estree"
import prettierPluginTypeScript from "prettier/plugins/typescript"
import prettier from "prettier/standalone"
import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { reducedMotion } from "../motion.ts"
import { ColorizedCode } from "./ColorizedCode.tsx"
import { writePrecompiled } from "./precompile.ts"
import {
	precompileWorkerUrl,
	type PrecompiledSize,
	type PrecompileRequest,
	type PrecompileResponse
} from "./precompiledState.ts"

const optimizations: Optimization[] = ["speed", "size"]

// edits settle before the program runs twice more
const settleMs = 250

let worker: Worker | undefined
let requests = 0
const pending = new Map<number, (response: PrecompileResponse) => void>()

const measure = (written: string[]): Promise<PrecompileResponse> => {
	if (!worker) {
		worker = new Worker(precompileWorkerUrl, { type: "module" })
		worker.onmessage = ({ data }: MessageEvent<PrecompileResponse>) => {
			pending.get(data.id)?.(data)
			pending.delete(data.id)
		}
		worker.onerror = () => {
			for (const [id, resolve] of pending)
				resolve({ id, error: "the measuring worker failed to start" })
			pending.clear()
			worker = undefined
		}
	}
	const request: PrecompileRequest = { id: ++requests, written }
	return new Promise(resolve => {
		pending.set(request.id, resolve)
		worker!.postMessage(request)
	})
}

const format = async (code: string) => {
	try {
		return await prettier.format(code, {
			parser: "typescript",
			plugins: [prettierPluginEstree, prettierPluginTypeScript],
			semi: false,
			useTabs: true,
			trailingComma: "none",
			arrowParens: "avoid",
			experimentalTernaries: true
		})
	} catch {
		return code
	}
}

const kB = (bytes: number) => `${(bytes / 1000).toFixed(1)} kB`

/** eases from the last value shown to the next, unless motion is reduced */
const useEased = (value: number | undefined): number | undefined => {
	const [shown, setShown] = useState(value)
	const from = useRef(value)
	useEffect(() => {
		if (value === undefined) return
		const start = from.current
		from.current = value
		if (start === undefined || reducedMotion()) return setShown(value)
		const began = performance.now()
		const step = (now: number) => {
			const t = Math.min((now - began) / 420, 1)
			setShown(start + (value - start) * (1 - (1 - t) ** 3))
			if (t < 1) frame = requestAnimationFrame(step)
		}
		let frame = requestAnimationFrame(step)
		return () => cancelAnimationFrame(frame)
	}, [value])
	return shown
}

interface Shown {
	code: string
	refusals: Record<string, string>
	size: PrecompiledSize | string | undefined
	// each is shown until what's written or measured next replaces it
	isCodeStale: boolean
	isSizeStale: boolean
}

const unwritten: Shown = {
	code: "",
	refusals: {},
	size: undefined,
	isCodeStale: true,
	isSizeStale: true
}

export const PrecompiledResult = ({
	source,
	js
}: {
	source: string
	js: string
}) => {
	const [optimize, setOptimize] = useState<Optimization>("speed")
	const [shown, setShown] = useState<Shown>(unwritten)

	useEffect(() => {
		let current = true
		const show = (next: Partial<Shown>) =>
			current && setShown(previous => ({ ...previous, ...next }))
		show({ isCodeStale: true, isSizeStale: true })
		const timeout = setTimeout(async () => {
			const { written, refusals } = await writePrecompiled(
				source,
				js,
				optimize
			).catch(
				(e: unknown): Awaited<ReturnType<typeof writePrecompiled>> => ({
					written: [],
					refusals: { Thing: e instanceof Error ? e.message : String(e) }
				})
			)
			if (!written.length) {
				return show({
					code: "",
					refusals,
					size: "",
					isCodeStale: false,
					isSizeStale: false
				})
			}
			// a size build picks checkers or compiled code by the size of the
			// runtime each reads, which only the worker holds
			if (written.length === 1)
				show({ code: await format(written[0]), refusals, isCodeStale: false })
			const response = await measure(written)
			if (!current) return
			const chosen = "error" in response ? 0 : response.chosen
			show({
				code: await format(written[chosen]),
				refusals,
				size: "error" in response ? response.error : response.size,
				isCodeStale: false,
				isSizeStale: false
			})
		}, settleMs)
		return () => {
			current = false
			clearTimeout(timeout)
		}
	}, [source, js, optimize])

	const size = typeof shown.size === "object" ? shown.size : undefined
	const gz = useEased(size?.gz)

	const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
		e.preventDefault()
		const next = optimizations[(optimizations.indexOf(optimize) + 1) % 2]
		setOptimize(next)
		e.currentTarget.parentElement
			?.querySelector<HTMLButtonElement>(`[data-for="${next}"]`)
			?.focus()
	}

	return (
		<div className="precompiled">
			<div className="pc-head">
				<div className="pc-seg" role="radiogroup" aria-label="optimize">
					{optimizations.map(option => (
						<button
							key={option}
							type="button"
							role="radio"
							data-for={option}
							aria-checked={optimize === option}
							tabIndex={optimize === option ? 0 : -1}
							onClick={() => setOptimize(option)}
							onKeyDown={onKeyDown}
						>
							optimize: "{option}"
						</button>
					))}
				</div>
				<p className="pc-size" data-stale={shown.isSizeStale || undefined}>
					{size && gz !== undefined ?
						<>
							<span className="pc-gz">≈{kB(gz)}</span> min+gz
						</>
					: typeof shown.size === "string" ?
						shown.size
					:	"measuring…"}
				</p>
			</div>
			{size && (
				<div className="pc-split" data-stale={shown.isSizeStale || undefined}>
					<div
						className="pc-bar"
						aria-hidden
						style={{
							gridTemplateColumns: `${size.ownMin}fr ${Math.max(size.min - size.ownMin, 0)}fr`
						}}
					>
						<i />
						<i />
					</div>
					<p>
						{kB(size.min)} minified: the validator, then the arktype/runtime it
						reads. Measured here by terser and gzip, without the module glue a
						bundler adds, so your build's number will differ a little.
					</p>
				</div>
			)}
			{Object.entries(shown.refusals).map(([name, reason]) => (
				<p key={name} className="pc-refusal">
					A build leaves <code>{name}</code> dynamic: {reason}
				</p>
			))}
			{!shown.isCodeStale &&
				!shown.code &&
				!Object.keys(shown.refusals).length && (
					<p className="pc-note">
						This module defines no Types for a build to precompile.
					</p>
				)}
			{shown.code && (
				<div data-stale={shown.isCodeStale || undefined}>
					<ColorizedCode lang="js" code={shown.code} />
				</div>
			)}
			<p className="pc-foot">
				What <code>@ark/aot</code> writes for this module, as{" "}
				<code>inline: true</code> writes it, formatted. A real build also drops
				the members your program never reads.
			</p>
		</div>
	)
}
