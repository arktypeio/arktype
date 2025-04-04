import { hasArkKind } from "@ark/schema"
import type { unset } from "@ark/util"
import { type } from "arktype"
import { failureBg, successBg } from "./utils.ts"

export type TraverseResult = type.errors | unset | {} | null | undefined

export declare namespace TraverseResult {
	export type Props = {
		traversed: TraverseResult
	}
}

export const TraverseResult = ({ traversed }: TraverseResult.Props) => (
	<div className="flex-1 min-h-0">
		<div
			style={{
				backgroundColor: hasArkKind(traversed, "errors") ? failureBg : successBg
			}}
			className="glass-container h-full p-4 rounded-2xl overflow-auto"
		>
			<h3 className="text-fd-foreground font-semibold mb-2">Output</h3>
			<pre className="m-0 whitespace-pre-wrap">
				<code>
					{traversed === undefined ?
						null
					: traversed instanceof type.errors ?
						`❌ problems:\n\n${traversed.summary}`
					:	`✅ data:\n\n${JSON.stringify(traversed, null, 2)}`}
				</code>
			</pre>
		</div>
	</div>
)
