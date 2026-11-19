import { Fragment } from "react"
import { diagnostic } from "./guarantee.ts"

const directive = "// @ark-runtime"

/**
 * What precompiling promises, as two things a reader can see: the validator
 * a build writes answers as the Type it replaces does, and a definition the
 * build can't precompile stops it with an error that says what to change.
 * The error is the tool's own (guarantee.ts), not a description of one.
 */
export const Guarantee = () => (
	<figure className="guarantee" id="guarantee">
		<pre
			className="guarantee-plugin"
			aria-label="vite.config.ts, the line added"
		>
			<span className="guarantee-file">vite.config.ts</span>
			<span className="guarantee-add">
				<span className="diff-mark" aria-hidden>
					+
				</span>
				plugins: [precompile.vite()]
			</span>
		</pre>
		<div className="guarantee-body">
			<h3>Same results. Same messages.</h3>
			<p>
				A precompiled validator accepts and rejects what the Type it replaces
				does, with the same error messages. If the build can't precompile a
				definition, it stops and says what to change:
			</p>
			<pre className="diag" aria-label="A build error from arktype-precompile">
				<span className="diag-at">{diagnostic.at}</span>
				{"  "}
				<span className="diag-what">{diagnostic.what}</span>
				{diagnostic.why.map(reason => (
					<span key={reason} className="diag-why">
						{reason}
					</span>
				))}
				<span className="diag-fix">
					{
						// the comment to copy stays on one line, wherever the fix wraps
						diagnostic.fix.split(directive).map((part, i) => (
							<Fragment key={i}>
								{i > 0 && <span className="diag-keep">{directive}</span>}
								{part}
							</Fragment>
						))
					}
				</span>
			</pre>
		</div>
		<figcaption>
			the build's own error · your agent fixes it from the message alone
		</figcaption>
	</figure>
)
