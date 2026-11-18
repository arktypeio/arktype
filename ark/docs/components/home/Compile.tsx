import { HomeCode, PlainCode } from "./HomeCode.tsx"

const source = `const Shape = type({
	kind: "'circle'",
	radius: "number > 0"
}).or({
	kind: "'square'",
	side: "number > 0"
})`

const emitted = `data => {
	switch (data?.kind) {
		case "circle":
			return Number.isFinite(data.radius) && data.radius > 0
		case "square":
			return Number.isFinite(data.side) && data.side > 0
	}
	return false
}`

/**
 * A definition and what the build makes of it: the union's discriminator
 * found, one switch, each branch checking only what's left. The plugin is
 * the line between them. home.css scans the source and writes the output out
 * line by line once it is seen; the markup is both, finished.
 */
export const Compile = () => (
	<div className="compile" data-stage="compile">
		<figure className="code-card compile-in">
			<figcaption>
				<span>
					<b>shape.ts</b>
					<span className="dot">·</span>what you write
				</span>
				<span>ArkType</span>
			</figcaption>
			<HomeCode code={source} />
			<span className="compile-scan" aria-hidden />
		</figure>
		<div className="compile-via" aria-hidden>
			<span className="compile-wire" />
			<code>precompile.vite()</code>
			<span className="compile-wire" />
		</div>
		<figure className="code-card glow compile-out">
			<figcaption>
				<span>
					<b>Shape</b>
					<span className="dot">·</span>precompiled
				</span>
				<span>helpers inlined</span>
			</figcaption>
			<PlainCode code={emitted} />
		</figure>
	</div>
)
