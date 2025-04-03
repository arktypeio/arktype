import { hasArkKind } from "@ark/schema"
import { ParseError, type } from "arktype"
import { failureBg, successBg } from "./utils.ts"

export declare namespace ValidationResult {
	export type Props = {
		result?: type.errors | ParseError | unknown
	}
}

export const ValidationResult = ({ result }: ValidationResult.Props) => (
	<div className="flex-1 min-h-0">
		<div
			style={{
				backgroundColor: hasArkKind(result, "errors") ? failureBg : successBg
			}}
			className="glass-container h-full p-4 rounded-2xl overflow-auto"
		>
			<h3 className="text-fd-foreground font-semibold mb-2">Output</h3>
			<pre className="m-0 whitespace-pre-wrap">
				<code>
					{result === undefined ?
						null
					: result instanceof type.errors ?
						`❌ problems:\n\n${result.summary}`
					: result instanceof ParseError ?
						`❌ParseError:\n\n${result}`
					:	`✅ data:\n\n${JSON.stringify(result, null, 2)}`}
				</code>
			</pre>
		</div>
	</div>
)
