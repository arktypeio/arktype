import { hasArkKind } from "@ark/schema"
import { printable, unset } from "@ark/util"
import type { type } from "arktype"
import { type ResultKind, backgroundsByResultKind } from "./utils.ts"

export type TraverseResult = type.errors | unset | {} | null | undefined

export declare namespace TraverseResult {
	export type Props = {
		traversed: TraverseResult
	}
}

export const TraverseResult = ({ traversed }: TraverseResult.Props) => {
	const resultKind: ResultKind =
		hasArkKind(traversed, "errors") ? "failure"
		: traversed === unset ? "none"
		: "success"

	return (
		<div
			style={{
				backgroundColor: backgroundsByResultKind[resultKind]
			}}
			className="glass-container h-full p-4 rounded-2xl overflow-auto"
		>
			<h3 className="text-3xl text-fd-foreground font-semibold mb-2">
				{resultKind === "failure" ? "ArkErrors" : "Out"}
			</h3>
			{
				<pre className="m-0 whitespace-pre-wrap">
					<code>
						{resultKind === "none" ?
							"(variable was never set)"
						: resultKind === "failure" ?
							(traversed as type.errors).summary
						:	printable(traversed, 4)}
					</code>
				</pre>
			}
		</div>
	)
}
