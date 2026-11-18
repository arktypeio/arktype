import type { CSSProperties } from "react"
import { startupFacts } from "./boardFacts.ts"

/** seconds the sweep takes to reach the costliest library's start */
const sweep = 3.4

/**
 * The login app's cold start as a sweep: every lane's bar grows at one
 * speed, a tick per million instructions, and stops where that library runs
 * its first validation. ArkType's stops inside the first tick. The markup is
 * the final state; home.css plays it once it is seen.
 */
export const ColdStart = () => {
	const { category, ours, rivals } = startupFacts()
	const bars = [ours, ...rivals]
	const max = Math.max(...bars.map(bar => bar.value))
	return (
		<figure
			className="boot"
			data-stage="boot"
			style={{ "--max": max, "--sweep": `${sweep}s` } as CSSProperties}
			aria-label={`${category.unit} from importing the login app through its first validation, lower is better: ${bars
				.map(bar => `${bar.name} ${category.format(bar.value)}`)
				.join(", ")}`}
		>
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
						<span className="boot-track">
							<span className="boot-bar" />
						</span>
						<span className="boot-val">
							<span className="boot-ready" aria-hidden />
							{category.format(bar.value)}
						</span>
					</li>
				))}
			</ol>
			<figcaption>
				one tick = a million instructions, from import through the first
				validation ·{" "}
				<a href={category.source.href} target="_blank" rel="noreferrer">
					{category.source.label}
				</a>{" "}
				· lower is better
			</figcaption>
		</figure>
	)
}
