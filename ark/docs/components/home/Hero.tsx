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
 * What the prompt does, which is what "away" leaves open. It names no build
 * plugin: the same prompt sets precompilation up (the migration guide's
 * "Precompile, if asked"), so the plugin isn't a second thing to do.
 */
export const heroLede =
	"Your agent migrates your schemas from Zod and precompiles them."

const rise = (i: number) => ({ "--i": i }) as CSSProperties

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
				{heroLede}
			</p>
			<div className="ctas rise" style={rise(3)}>
				<Link className="btn btn-gold" href="/docs/intro/setup">
					Get started{" "}
					<span className="arrow" aria-hidden>
						→
					</span>
				</Link>
				<a className="btn" href="#migrate">
					Migrate from Zod
				</a>
				<span className="hero-foot">
					{medianOf(zodCompiled.versus)} faster than Zod's own{" "}
					<code>z.compile</code> at the median, too ·{" "}
					<Link href={methodHref}>how we measured →</Link>
				</span>
			</div>
		</section>
	)
}
