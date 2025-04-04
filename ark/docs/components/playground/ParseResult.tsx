import type { type } from "arktype"

export type ParseResult = type | string

export declare namespace ParseResult {
	export type Props = {
		parsed: ParseResult
	}
}

export const ParseResult = ({ parsed }: ParseResult.Props) => (
	<div className="flex-1 min-h-0">
		<div
			style={{ backgroundColor: "#08161791" }}
			className="glass-container editor-bg h-full p-4 rounded-2xl overflow-auto"
		>
			<h3 className="text-fd-foreground font-semibold mb-2">Definition</h3>
			<pre className="m-0 whitespace-pre-wrap">
				<code>{typeof parsed === "string" ? parsed : parsed.expression}</code>
			</pre>
		</div>
	</div>
)
