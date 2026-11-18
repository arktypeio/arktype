import Link from "next/link"
import type { CSSProperties } from "react"
import { preview } from "../../lib/bench/bench.ts"
import { claims, medianOf } from "../../lib/claims.ts"
import { ClaimText } from "../mdx/Claim.tsx"
import { BoardTitle } from "./Board.tsx"
import { categoryOf, heroStats } from "./boardFacts.ts"

/**
 * The hero's second line, after the headline lib/claims.ts guards. It states
 * no number, so it lives here; the candidates it was elected from are in the
 * commit that added it.
 */
export const heroLine = "Optimized for agents and humans."

/** what the build step and the migration each cost, which is the pitch */
export const heroLede = "One Vite plugin. One prompt to leave Zod."

const rise = (i: number) => ({ "--i": i }) as CSSProperties

export type HeroProps = {
	/**
	 * `claim`: the headline lib/claims.ts guards, then the tagline. `board`:
	 * the board's title, "Pick 2" struck out, as the first thing read.
	 */
	title: "claim" | "board"
}

/**
 * The first screen: the claim, then the three numbers that back it at the
 * size of a headline, each against Zod 4, scoped in its own caption and
 * linked to the section that measures it.
 */
export const Hero = ({ title }: HeroProps) => {
	const [, zodCompiled] = categoryOf("speed").versus
	return (
		<section className="hero" aria-labelledby="hero-title" data-hero>
			<div className="eyebrow rise" style={rise(0)}>
				<b>arktype</b> {"//"} TypeScript's 1:1 validator
				{preview && (
					<Link className="eyebrow-new" href="/docs/precompile">
						precompile <span className="next-tag">next release</span>
					</Link>
				)}
			</div>
			{title === "claim" ?
				<h1 id="hero-title" className="rise-fade">
					<ClaimText claim={claims.headline} />{" "}
					<span className="one">{heroLine}</span>
				</h1>
			:	<h1 id="hero-title" className="hero-pick" data-board>
					<BoardTitle />
				</h1>
			}
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
					<a href="#board-note">how we measured ↓</a>
				</span>
			</div>
		</section>
	)
}
