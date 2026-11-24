import { Fragment } from "react"
import { diagnostic, refused } from "./guarantee.ts"

const directive = "// @ark-runtime"

/**
 * What precompiling promises, as two things a reader can see: the validator
 * a build writes answers as the Type it replaces does, and a definition the
 * build can't precompile stops it with an error that says what to change.
 * The source and error are the tool's own (guarantee.ts), verified by test.
 */
export const Guarantee = () => (
	<figure className="guarantee" id="guarantee">
		<div className="guarantee-src">
			<span className="guarantee-file">{refused.file}</span>
			<pre aria-label={`${refused.file}: a dynamic definition`}>
				<code>{refused.source.trim()}</code>
			</pre>
		</div>
		<div className="guarantee-body">
			<h3>Same results. Same messages.</h3>
			<p>
				A precompiled validator accepts and rejects what the Type it replaces
				does, with the same error messages. If <code>@ark/aot</code> can't
				precompile a definition, the build stops and says what to change:
			</p>
			<pre className="diag" aria-label="A build error from @ark/aot">
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
