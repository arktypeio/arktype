"use client"

import {
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type ReactNode
} from "react"
import { withBase } from "../../lib/basePath.ts"
import {
	compileWorkerUrl,
	type CompileRequest,
	type CompileResponse,
	type CompileResult,
	type Emitted
} from "./compileState.ts"

/** an edit the figure offers to make for the reader */
export type Try = {
	label: string
	/** the whole file, as it reads once the edit is made */
	source: string
}

export type CompileLiveProps = {
	/** the definition the figure opens on, as the reader may edit it */
	source: string
	/** that definition, highlighted at build */
	input: ReactNode
	/** what the precompiler wrote for it when the site was built */
	initial: Emitted
	tries: Try[]
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

type WrittenProps = {
	code: string
}

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

/**
 * A check, a line to a block: a long one wraps under itself, inside the
 * card, instead of running off its edge.
 */
const Written = ({ code }: WrittenProps) => (
	<pre className="compile-real">
		{code.split("\n").map((line, i) => (
			<span key={i} className="js-line">
				{paint(line)}
			</span>
		))}
	</pre>
)

const linesOf = (code: string) => code.split("\n").length

const count = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`

/** long enough that a word typed at speed is compiled once */
const debounceMs = 140

/**
 * The definition and what ships for it. As served, what ships is what the
 * precompiler wrote for this definition when the site was built. Once the
 * reader edits the definition, the precompiler itself starts in a worker and
 * the right-hand card shows what it writes for whatever they type, through
 * the same emit and the same markup: one output for one input.
 */
export const CompileLive = ({
	source,
	input,
	initial,
	tries
}: CompileLiveProps) => {
	const [editing, setEditing] = useState(false)
	const [text, setText] = useState(source)
	const [result, setResult] = useState<CompileResult>(initial)
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

	const attempt = (next: string) => {
		setEditing(true)
		setText(next)
		compile(next)
	}

	const reset = () => {
		clearTimeout(timerRef.current)
		latestRef.current++
		setEditing(false)
		setText(source)
		setResult(initial)
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
				style={{ "--rows": linesOf(source) + 1 } as CSSProperties}
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
				<footer>
					<span>
						{editing ?
							"compiled as you type"
						:	"the real precompiler runs in this tab"}
					</span>
					<span
						className="compile-tries"
						role="group"
						aria-label="Edits to try"
					>
						{tries.map(attempted => (
							<button
								key={attempted.label}
								type="button"
								className="compile-try"
								aria-pressed={editing && text === attempted.source}
								onClick={() => attempt(attempted.source)}
							>
								{attempted.label}
							</button>
						))}
					</span>
				</footer>
			</figure>
			<figure
				className="code-card glow compile-out"
				data-live={editing ? "" : undefined}
				data-pending={pending ? "" : undefined}
			>
				<figcaption>
					<Step n={3}>what ships</Step>
					<span>
						{result.ok ?
							"as emitted · names shortened"
						:	"nothing: the build stops"}
					</span>
				</figcaption>
				<div className="compile-result" role="status" aria-live="polite">
					{result.ok ?
						<>
							<Written code={result.main} />
							{result.helpers.length ?
								<details
									className="compile-helpers"
									// an edit often lands in a helper: while editing they are
									// shown, in a window that scrolls instead of growing
									open={editing || undefined}
								>
									<summary>{count(result.helpers.length, "helper")}</summary>
									{result.helpers.map((helper, i) => (
										<Written key={i} code={helper} />
									))}
								</details>
							:	null}
						</>
					:	<p className="compile-fail">{result.message}</p>}
				</div>
				<footer>
					{result.ok ?
						<>
							<span>
								{count(linesOf(result.main), "line")}
								{result.helpers.length ?
									` + ${count(result.helpers.length, "helper")}`
								:	""}{" "}
								· no parser, no <code>new Function</code>
							</span>
							<span>error path and wiring not shown</span>
						</>
					:	<span>
							the real precompiler{editing ? ", running in this tab" : ""}
						</span>
					}
				</footer>
			</figure>
		</>
	)
}
