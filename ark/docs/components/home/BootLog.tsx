import type { CSSProperties } from "react"
import { formatRatio } from "../../lib/bench/bench.ts"
import { startupFacts } from "./boardFacts.ts"

/** seconds the costliest library's start takes to play */
const sweep = 6

/**
 * The login app's cold start as a boot log: every library starts at once
 * and its count of instructions runs up at one speed until it has run its
 * first validation. ArkType's is done inside the first tick, while the
 * others are still counting.
 *
 * The run tells that on its own; the frame it rests on has to as well, when
 * every lane has finished and carries a tick. So where ArkType finished is
 * marked on every other lane, and each of those rests on how many times
 * ArkType's work it ran (its count over ArkType's, from the same two
 * numbers the lanes print) instead of on the same "first validation".
 *
 * The markup is the final state; landing.css and HomeEffects play it once
 * it is seen.
 */
export const BootLog = () => {
	const { category, ours, rivals } = startupFacts()
	const bars = [ours, ...rivals]
	const max = Math.max(...bars.map(bar => bar.value))
	return (
		<figure
			className="boot"
			data-stage="boot"
			style={
				{
					"--max": max,
					"--ours": ours.value,
					"--sweep": `${sweep}s`
				} as CSSProperties
			}
			aria-label={`${category.unit} from importing the login app through its first validation, lower is better: ${bars
				.map(bar => `${bar.name} ${category.format(bar.value)}`)
				.join(", ")}`}
		>
			<div className="boot-head">
				<span>
					<span className="p">$</span> node login-app.js
				</span>
				<span className="boot-unit">CPU instructions run</span>
				<button className="boot-replay" type="button">
					replay
				</button>
			</div>
			<ol>
				{bars.map(bar => (
					<li
						key={bar.name}
						className={bar === ours ? "boot-lane is-ours" : "boot-lane"}
						style={
							{
								"--v": bar.value,
								"--at": `${((sweep * bar.value) / max).toFixed(3)}s`
							} as CSSProperties
						}
					>
						<span className="boot-name">{bar.name}</span>
						<span className="boot-status">
							<span className="boot-run" aria-hidden>
								{bar === ours ? "importing" : "building schemas"}
							</span>
							<span className="boot-done">
								{bar === ours ?
									"✓ first validation"
								:	`✓ ${formatRatio(bar.value / ours.value)} the work`}
							</span>
						</span>
						<span
							className="boot-val"
							data-to={bar.value}
							data-seconds={((sweep * bar.value) / max).toFixed(3)}
						>
							{category.format(bar.value)}
						</span>
						<span className="boot-track" aria-hidden>
							<span className="boot-bar" />
						</span>
					</li>
				))}
			</ol>
			<figcaption>
				CPU instructions from import through the first validation, lower is
				better · <span className="boot-key" aria-hidden /> where ArkType
				finished ·{" "}
				<a href={category.source.href} target="_blank" rel="noreferrer">
					{category.source.label}
				</a>
			</figcaption>
		</figure>
	)
}
