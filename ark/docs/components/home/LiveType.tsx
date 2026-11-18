"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { sleep } from "../motion.ts"
import { startLiveEngine, type LiveEngine } from "./liveEngine.ts"
import type { LiveState } from "./liveState.ts"
import { tokenizeDefinition } from "./liveSyntax.ts"

type Example = {
	/** what trying it shows, since the definition alone doesn't say */
	label: string
	def: string
	arg: string
}

const chips: Example[] = [
	{ label: "two checks → one", def: "number % 2 & number % 3", arg: "9" },
	{ label: "impossible range", def: "5 < number < 3", arg: "4" },
	{ label: "typo → did you mean", def: "string.emial", arg: '"a@b.io"' },
	{
		label: "array of a union",
		def: "(string | number)[]",
		arg: '[1, "2", true]'
	},
	{ label: "string or null", def: "string > 3 | null", arg: '"ark"' }
]

/** warm the parser once the pointer comes this close to the card */
const intentDistance = 600

/** the width from which the card sits beside the one before it, as landing.css lays them out */
const sideBySide = "(min-width: 1081px)"

/** how long a neighbour that hasn't started is waited for, and one that has is waited on */
const neighbourWait = { start: 1500, finish: 4500 }

/**
 * Resolves once the figure this card shares a row with has finished playing.
 * Side by side, the interface → Type wipe and this card's ghost typing
 * started together and neither got watched; now the wipe lands its two
 * errors first and the typing follows. Stacked, or alone, there is nothing
 * to wait for. Both waits are bounded, so the line is never held blank on a
 * neighbour that doesn't play.
 */
const afterNeighbour = async (line: HTMLElement) => {
	const neighbour = line
		.closest(".write-pair")
		?.querySelector<HTMLElement>("[data-stage]")
	if (!neighbour || !matchMedia(sideBySide).matches) return
	if (!("play" in neighbour.dataset)) {
		await new Promise<void>(resolve => {
			const done = () => {
				watcher.disconnect()
				clearTimeout(timer)
				resolve()
			}
			const watcher = new MutationObserver(done)
			const timer = setTimeout(done, neighbourWait.start)
			watcher.observe(neighbour, {
				attributes: true,
				attributeFilter: ["data-play"]
			})
		})
	}
	await Promise.race([
		Promise.allSettled(
			neighbour.getAnimations({ subtree: true }).map(played => played.finished)
		),
		sleep(neighbourWait.finish)
	])
}

/** html[data-ghost] (see the home layout) hides what the ghost animates */
const revealGhosted = () => delete document.documentElement.dataset.ghost

export type LiveTypeProps = {
	/** every prefix of the definition, parsed at build; the last is the prerendered state */
	ghost: LiveState[]
	arg: string
}

/**
 * `const T = type("…")` running the real parser. The prerendered markup is
 * the final state. On first view it ghost-types the definition from states
 * parsed at build, so it never waits on the parser; the parser itself starts
 * in a worker only on intent: the pointer nearby, focus or a press.
 */
export const LiveType = ({ ghost, arg: initialArg }: LiveTypeProps) => {
	const final = ghost.at(-1)!
	const [def, setDef] = useState(final.def)
	const [arg, setArg] = useState(initialArg)
	const [state, setState] = useState<LiveState>(final)
	const [ghosting, setGhosting] = useState(false)
	/** the ghost has typed nothing that parses yet, so there is no result to show */
	const [unparsed, setUnparsed] = useState(false)
	const [pressed, setPressed] = useState(-1)
	const [live, setLive] = useState(false)
	/** a call is out and the shown verdict is for an earlier definition */
	const [pending, setPending] = useState(false)
	const cardRef = useRef<HTMLElement>(null)
	const lineRef = useRef<HTMLDivElement>(null)
	const engineRef = useRef<LiveEngine>(undefined)
	const ghostRef = useRef({ cancelled: false })

	const warm = () =>
		(engineRef.current ??= startLiveEngine({
			onReady: () => setLive(true),
			onState: next => {
				setState(next)
				setPending(false)
			}
		}))

	const stopGhost = () => {
		if (ghostRef.current.cancelled) return
		ghostRef.current.cancelled = true
		setGhosting(false)
		revealGhosted()
	}

	/** a focus or press during the ghost lands the final line */
	const interrupt = () => {
		if (ghostRef.current.cancelled) return
		stopGhost()
		setDef(final.def)
		setState(final)
	}

	const run = (nextDef: string, nextArg: string) => {
		stopGhost()
		setPending(true)
		warm().run(nextDef, nextArg)
	}

	useEffect(() => {
		const card = cardRef.current
		const line = lineRef.current
		if (!card || !line) return
		const near = (e: PointerEvent) => {
			const r = card.getBoundingClientRect()
			const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right)
			const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom)
			if (Math.hypot(dx, dy) > intentDistance) return
			removeEventListener("pointermove", near)
			warm()
		}
		addEventListener("pointermove", near, { passive: true })

		const token = { cancelled: false }
		ghostRef.current = token
		const play = async () => {
			if (token.cancelled) return
			setGhosting(true)
			setUnparsed(true)
			setDef("")
			await sleep(200)
			let shown: LiveState | undefined
			for (const step of ghost) {
				if (token.cancelled) return
				setDef(step.def)
				// half-typed, a definition is an error only the ghost made: the
				// result stays the last one that parsed
				const lands =
					step.ok && !(shown?.ok && shown.description === step.description)
				if (lands) {
					shown = step
					setState(step)
					setUnparsed(false)
				}
				await sleep(lands ? 420 : 46)
			}
			if (token.cancelled) return
			token.cancelled = true
			setGhosting(false)
		}

		let observer: IntersectionObserver | undefined
		const root = document.documentElement
		if (root.dataset.ghost !== "") {
			// reduced motion, ?still, or hydrated too late to erase a line already shown
			token.cancelled = true
			revealGhosted()
		} else {
			root.dataset.ghost = "claimed"
			observer = new IntersectionObserver(
				([entry]) => {
					if (!entry.isIntersecting) return
					observer?.disconnect()
					void afterNeighbour(line).then(play)
				},
				{ threshold: 0 }
			)
			observer.observe(line)
		}

		return () => {
			removeEventListener("pointermove", near)
			observer?.disconnect()
			token.cancelled = true
			// unplayed, so the next mount (strict mode's included) plays it
			if (root.dataset.ghost) root.dataset.ghost = ""
		}
	}, [])

	// the line is blank now, so showing the card can't flash the final state
	useEffect(() => {
		if (ghosting && def === "") revealGhosted()
	}, [ghosting, def])

	const settled = !ghosting || def === final.def
	/** until the ghost's first result; a definition the reader clears gets the parser's message */
	const blank = ghosting && unparsed
	return (
		<figure
			ref={cardRef}
			className="code-card glow live"
			aria-label="Live ArkType parser"
			onFocus={warm}
			onPointerDown={warm}
		>
			<figcaption>
				<span>
					<b>arktype</b>
					<span className="dot">·</span>the real parser
					<span className="cap-wide">, in this page</span>
				</span>
				<span className="hint">
					<span className="hover-word">edit the string</span>
					<span className="tap-word">tap to edit</span>
				</span>
			</figcaption>
			<div className="live-body" data-pending={pending ? "" : undefined}>
				<div
					ref={lineRef}
					className="tl"
					data-ghosting={ghosting ? "" : undefined}
					style={
						{
							"--final": final.def.length,
							"--typed": ghosting ? Math.max(def.length, 1) : undefined
						} as CSSProperties
					}
				>
					<span className="k">const</span> <span className="decl">T</span>{" "}
					<span className="k">=</span> <span className="fn">type</span>
					<span className="y">(&quot;</span>
					<label
						className="field"
						data-state={
							blank ? undefined
							: state.ok ?
								"ok"
							:	"err"
						}
					>
						<span className="mirror" aria-hidden>
							{def ?
								tokenizeDefinition(def).map((token, i) => (
									<span key={i} className={token.kind && `m-${token.kind}`}>
										{token.text}
									</span>
								))
							:	" "}
						</span>
						<input
							value={def}
							spellCheck={false}
							autoComplete="off"
							autoCapitalize="off"
							aria-label="ArkType definition"
							onFocus={interrupt}
							onPointerDown={interrupt}
							onChange={e => {
								setDef(e.target.value)
								setPressed(-1)
								run(e.target.value, arg)
							}}
						/>
					</label>
					<span className="y">&quot;)</span>
				</div>
				<div
					className="verdict"
					data-state={state.ok ? "ok" : "err"}
					data-ghost={settled ? undefined : ""}
					role="status"
					aria-live={ghosting ? "off" : "polite"}
				>
					<span className="mark">
						{blank ?
							""
						: state.ok ?
							"✓"
						:	"✗"}
					</span>
					<span>
						<span className="desc">
							{blank ?
								""
							: state.ok ?
								state.description
							:	state.message}
						</span>
						{!blank && state.ok && state.expression !== state.description && (
							<small className="expr">{state.expression}</small>
						)}
					</span>
				</div>
				<div className="call">
					<div className="tl">
						<span className="decl">T</span>
						<span className="y">(</span>
						<label className="field arg">
							<span className="mirror" aria-hidden>
								{arg || " "}
							</span>
							<input
								value={arg}
								spellCheck={false}
								autoComplete="off"
								autoCapitalize="off"
								aria-label="Data to validate"
								onFocus={interrupt}
								onPointerDown={interrupt}
								onChange={e => {
									setArg(e.target.value)
									run(def, e.target.value)
								}}
							/>
						</label>
						<span className="y">)</span>
					</div>
					<output
						className="out"
						data-state={
							blank ? undefined
							: !state.ok ?
								undefined
							: state.outOk ?
								"ok"
							:	"err"
						}
					>
						{blank ? "" : state.out}
					</output>
				</div>
			</div>
			<div className="chips" role="group" aria-label="Try a definition">
				{chips.map((chip, i) => (
					<button
						key={chip.def}
						type="button"
						className="chip"
						aria-pressed={pressed === i}
						title={chip.def}
						onClick={() => {
							setPressed(i)
							setDef(chip.def)
							setArg(chip.arg)
							run(chip.def, chip.arg)
						}}
					>
						{chip.label}
					</button>
				))}
			</div>
			<footer>
				<span>
					the same syntax <code>tsc</code> checks in your editor
				</span>
				<span className="live-state" data-live={live ? "" : undefined}>
					{live ? "● live" : "parsed at build"}
				</span>
			</footer>
		</figure>
	)
}
