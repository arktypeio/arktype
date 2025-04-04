import type { type } from "arktype"
import { backgroundsByResultKind, type ResultKind } from "./utils.ts"

export type ParseResult = type | string | undefined

export declare namespace ParseResult {
	export type Props = {
		parsed: ParseResult
	}
}

export const ParseResult = ({ parsed }: ParseResult.Props) => {
	const resultKind: ResultKind =
		typeof parsed === "string" ? "failure"
		: parsed === undefined ? "none"
		: "success"
	return (
		<div className="flex-1 min-h-0">
			<div
				style={{
					backgroundColor: backgroundsByResultKind[resultKind]
				}}
				className="glass-container editor-bg h-full p-4 rounded-2xl overflow-auto"
			>
				<h3 className=" text-2xl text-fd-foreground font-semibold mb-2">
					Type
				</h3>
				{parsed === undefined ?
					<>
						(<code>MyType</code> variable was never set)
					</>
				:	<pre className="m-0 whitespace-pre-wrap">
						<code>
							{typeof parsed === "string" ? parsed : parsed.expression}
						</code>
					</pre>
				}
			</div>
		</div>
	)
}
