import { unset } from "@ark/util"
import type { type } from "arktype"
import { backgroundsByResultKind, type ResultKind } from "./utils.ts"

export type ParseResult = type | Error | unset

export declare namespace ParseResult {
	export type Props = {
		parsed: ParseResult
	}
}

export const ParseResult = ({ parsed }: ParseResult.Props) => {
	const resultKind: ResultKind =
		parsed instanceof Error ? "failure"
		: parsed === unset ? "none"
		: "success"

	const title = parsed instanceof Error ? parsed.name : "Type"

	return (
		<div className="flex-1 min-h-0">
			<div
				style={{
					backgroundColor: backgroundsByResultKind[resultKind]
				}}
				className="glass-container editor-bg h-full p-4 rounded-2xl overflow-auto"
			>
				<h3 className="text-3xl text-fd-foreground font-semibold mb-2">
					{title}
				</h3>
				{parsed === unset ?
					<>
						(<code>MyType</code> variable was never set)
					</>
				:	<pre className="m-0 whitespace-pre-wrap">
						<code>
							{parsed instanceof Error ?
								`${parsed.message}`
							:	parsed.expression}
						</code>
					</pre>
				}
			</div>
		</div>
	)
}
