"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { withBase } from "../../lib/basePath.ts"
import {
	compileWorkerUrl,
	type CompileRequest,
	type CompileResponse,
	type CompileResult
} from "./compileState.ts"

export type CompileLiveProps = {
	/** the definition the figure opens on, as the reader may edit it */
	source: string
	/** that definition, highlighted at build */
	input: ReactNode
	/** what the build makes of it, highlighted at build, with its helpers inlined to read */
	output: ReactNode
	/** how many lines that is */
	lines: number
}

type StepProps = {
	n: number
	children: string
}

/** a stage of the build, numbered in the order the figure plays them */
export const Step = ({ n, children }: StepProps) => (
	<span className="compile-step">
		<b>{n}</b>
		{children}
	</span>
)

const tokens =
	/("(?:[^\n"\\]|\\.)*")|\b(const|function|return|for|if|break|switch|case|typeof|true|false)\b|\b(\d+(?:\.\d+)?)\b/g

/** emitted JavaScript, coloured enough to read: strings, keywords and numbers */
const paint = (code: string): ReactNode[] => {
	const painted: ReactNode[] = []
	let from = 0
	for (const match of code.matchAll(tokens)) {
		painted.push(code.slice(from, match.index))
		painted.push(
			<span
				key={match.index}
				className={
					match[1] ? "js-str"
					: match[2] ?
						"js-kw"
					:	"js-num"
				}
			>
				{match[0]}
			</span>
		)
		from = match.index + match[0].length
	}
	painted.push(code.slice(from))
	return painted
}

/** long enough that a word typed at speed is compiled once */
const debounceMs = 140

/**
 * The definition and what ships for it. As served it is the build's own
 * rendering, and landing.css plays it. Once the reader edits the definition,
 * the precompiler itself starts in a worker and the right-hand card shows
 * the checks it writes, as it writes them, for whatever they type.
 */
export const CompileLive = ({
	source,
	input,
	output,
	lines
}: CompileLiveProps) => {
	const [editing, setEditing] = useState(false)
	const [text, setText] = useState(source)
	const [result, setResult] = useState<CompileResult>()
	const [pending, setPending] = useState(false)
	const fieldRef = useRef<HTMLTextAreaElement>(null)
	const workerRef = useRef<Worker>(undefined)
	const latestRef = useRef(0)
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

	const fail = (message: string) => {
		setResult({ ok: false, message })
		setPending(false)
	}

	const start = () => {
		if (workerRef.current) return workerRef.current
		const worker = new Worker(withBase(compileWorkerUrl), { type: "module" })
		worker.onmessage = ({ data }: MessageEvent<CompileResponse>) => {
			if ("ready" in data || data.id !== latestRef.current) return
			setResult(data.result)
			setPending(false)
		}
		worker.onerror = () =>
			fail("The precompiler couldn't start in this browser.")
		workerRef.current = worker
		return worker
	}

	const compile = (next: string) => {
		setPending(true)
		clearTimeout(timerRef.current)
		timerRef.current = setTimeout(() => {
			try {
				const request: CompileRequest = {
					id: ++latestRef.current,
					source: next
				}
				start().postMessage(request)
			} catch {
				fail("The precompiler couldn't start in this browser.")
			}
		}, debounceMs)
	}

	const edit = () => {
		if (editing) return
		setEditing(true)
		compile(text)
	}

	const reset = () => {
		clearTimeout(timerRef.current)
		latestRef.current++
		setEditing(false)
		setText(source)
		setResult(undefined)
		setPending(false)
	}

	// the field replaces the code the reader pressed, so it takes the caret
	useEffect(() => {
		if (editing) fieldRef.current?.focus({ preventScroll: true })
	}, [editing])

	useEffect(
		() => () => {
			clearTimeout(timerRef.current)
			workerRef.current?.terminate()
			workerRef.current = undefined
		},
		[]
	)

	return (
		<>
			<figure
				className="code-card compile-in"
				data-editing={editing ? "" : undefined}
			>
				<figcaption>
					<Step n={2}>write a Type</Step>
					<span className="compile-file">
						shape.ts
						{editing ?
							<button type="button" className="compile-act" onClick={reset}>
								reset
							</button>
						:	<button type="button" className="compile-act" onClick={edit}>
								edit it live
							</button>
						}
					</span>
				</figcaption>
				{editing ?
					<textarea
						ref={fieldRef}
						className="compile-edit"
						value={text}
						rows={Math.max(text.split("\n").length, source.split("\n").length)}
						spellCheck={false}
						autoComplete="off"
						autoCapitalize="off"
						aria-label="shape.ts: a Type's declaration, compiled as you type"
						onChange={e => {
							setText(e.target.value)
							compile(e.target.value)
						}}
						onKeyDown={e => {
							// a tab is a tab here, as it is in an editor
							if (e.key !== "Tab" || e.shiftKey) return
							e.preventDefault()
							const field = e.currentTarget
							const { selectionStart, selectionEnd } = field
							field.setRangeText("\t", selectionStart, selectionEnd, "end")
							setText(field.value)
							compile(field.value)
						}}
					/>
				:	<div className="compile-source" onClick={edit}>
						{input}
					</div>
				}
				<span className="compile-scan" aria-hidden />
			</figure>
			<figure
				className="code-card glow compile-out"
				data-live={result ? "" : undefined}
				data-pending={pending ? "" : undefined}
			>
				<figcaption>
					<Step n={3}>what ships</Step>
					<span>
						{result?.ok ?
							`as emitted: ${result.checks} ${result.checks === 1 ? "check" : "checks"}, the Type's own first`
						: result ?
							"nothing: the build stops"
						:	"Shape's check, helpers inlined"}
					</span>
				</figcaption>
				<div className="compile-result" role="status" aria-live="polite">
					{result?.ok ?
						<pre className="compile-real">{paint(result.code)}</pre>
					: result ?
						<p className="compile-fail">{result.message}</p>
					:	output}
				</div>
				<footer>
					{result ?
						<span>
							the real precompiler, running in this tab · the error path and
							wiring aren't shown
						</span>
					:	<span>
							{lines} lines of plain JavaScript · no parser, no{" "}
							<code>new Function</code>
						</span>
					}
				</footer>
			</figure>
		</>
	)
}
