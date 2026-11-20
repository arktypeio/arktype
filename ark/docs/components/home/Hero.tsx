import Link from "next/link"
import type { CSSProperties } from "react"
import { preview } from "../../lib/bench/bench.ts"
import { claims, medianOf } from "../../lib/claims.ts"
import { ClaimText } from "../mdx/Claim.tsx"
import { categoryOf, heroStats, methodHref } from "./boardFacts.ts"

/**
 * The hero's second line, after the headline lib/claims.ts guards: with it
 * the h1 is the tagline word for word (siteDescription in app/metadata.ts,
 * package.json, the README). It states no number, so it lives here.
 */
export const heroLine = "One prompt away."

/**
 * The quest the hero offers, under its numbers: a link to #migrate, which is
 * where "one prompt" is spelled out. It promises nothing the prompt has to
 * do, so the prompt it leads to is the short one.
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
 * The first screen: the claim, then the three numbers that back it at the
 * size of a headline, each against Zod 4, scoped in its own caption and
 * linked to the section that measures it.
 */
export const Hero = () => {
	const [, zodCompiled] = categoryOf("speed").versus
	return (
		<section className="hero" aria-labelledby="hero-title" data-hero>
			<div className="eyebrow rise" style={rise(0)}>
				<b>arktype</b>
				{preview && (
					<Link className="eyebrow-new" href="/docs/precompile">
						precompile <span className="next-tag">next release</span>
					</Link>
				)}
			</div>
			<h1 id="hero-title" className="rise-fade">
				<ClaimText claim={claims.headline} />{" "}
				<span className="one">{heroLine}</span>
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
				<span className="quest-cta">
					<a className="btn" href="#migrate">
						Migrate from Zod
					</a>
					{/* what taking the quest does: landing.css sends these up past the button */}
					<span className="level-up" aria-hidden>
						<i />
						<i />
						<i />
						<i />
					</span>
				</span>
				<span className="hero-foot">
					{medianOf(zodCompiled.versus)} faster than Zod's own{" "}
					<code>z.compile</code> at the median, too ·{" "}
					<Link href={methodHref}>how we measured →</Link>
				</span>
			</div>
		</section>
	)
}
