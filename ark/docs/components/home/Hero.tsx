import Link from "next/link"
import type { CSSProperties } from "react"
import { claims } from "../../lib/claims.ts"
import { ClaimText } from "../mdx/Claim.tsx"
import { heroLine, heroStats } from "./boardFacts.ts"
import { CheckIcon, CopyIcon } from "./icons.tsx"
import { migratePromptAot } from "./prompts.ts"

export { heroLine }

/**
 * The quest the hero offers, under its numbers: a link to #migrate, which is
 * where "one prompt" is spelled out.
 */
export const heroLede = "Level up your Zod schemas."

const rise = (i: number) => ({ "--i": i }) as CSSProperties

/**
 * "A quest is available here": an exclamation point drawn for this page, a
 * tapered stroke over a round dot, in the gold of the button under it. The
 * page has one, and the link it sits in is named by its sentence alone.
 */
const QuestMark = () => (
	<svg className="quest-mark" viewBox="0 0 10 24" aria-hidden focusable="false">
		<path d="M5 1C3.2 1 1.9 2.3 2.1 4.1l1.2 10.6c.1 1 .8 1.6 1.7 1.6s1.6-.6 1.7-1.6L7.9 4.1C8.1 2.3 6.8 1 5 1Z" />
		<circle cx="5" cy="20.6" r="2.4" />
	</svg>
)

/**
 * The first screen: the claim (scoped to @ark/aot right in the eyebrow), the
 * three headline ratios against Zod 4 in Speed -> Size -> Startup order,
 * and two focused CTAs: Get started or copy the one-prompt migration.
 */
export const Hero = () => (
	<section className="hero" aria-labelledby="hero-title" data-hero>
		<div className="eyebrow rise" style={rise(0)}>
			<b>arktype 3.0</b>
			<a className="eyebrow-new" href="#precompile">
				precompiled with @ark/aot
			</a>
		</div>
		<h1 id="hero-title" className="rise-fade">
			<ClaimText claim={claims.headline} />{" "}
			<a className="one" href="#migrate">
				{heroLine}
			</a>
		</h1>
		<div className="hero-stats rise" style={rise(1)}>
			{heroStats().map(stat => {
				const [, digits, suffix] = /^([\d.]+)(.*)$/.exec(stat.value)!
				return (
					<a
						key={stat.href}
						className="hero-stat"
						href={stat.href}
						// its number counts up through values that aren't the claim
						aria-label={`${stat.value} ${stat.unit} than Zod 4: ${stat.scope}`}
					>
						<span
							className="stat-num"
							data-to={digits}
							data-decimals={digits.split(".")[1]?.length ?? 0}
							data-suffix={suffix}
						>
							{stat.value}
						</span>
						<span className="hero-stat-what">
							<b>{stat.unit}</b> than Zod 4
						</span>
						<span className="hero-stat-scope">{stat.scope}</span>
					</a>
				)
			})}
		</div>
		<p className="lede rise" style={rise(2)}>
			<a className="quest" href="#migrate">
				<QuestMark />
				{heroLede}
			</a>
		</p>
		<div className="ctas rise" style={rise(3)}>
			<Link className="btn btn-gold" href="/docs/intro/setup">
				Get started{" "}
				<span className="arrow" aria-hidden>
					→
				</span>
			</Link>
			<button
				type="button"
				className="btn btn-copy-prompt"
				data-copy={migratePromptAot}
				title={migratePromptAot}
			>
				<span className="swap">
					<span className="idle">
						Copy migration prompt
						<span className="visually-hidden"> (with @ark/aot)</span>{" "}
						<CopyIcon />
					</span>
					<span className="done" aria-hidden>
						copied · paste in agent <CheckIcon />
					</span>
				</span>
				<span className="visually-hidden" role="status" />
			</button>
		</div>
	</section>
)
