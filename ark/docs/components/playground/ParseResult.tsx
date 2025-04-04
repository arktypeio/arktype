import { unset } from "@ark/util"
import { Type, type type } from "arktype"
import { RestoreDefault } from "./RestoreDefault.tsx"
import {
	backgroundsByResultKind,
	playgroundTypeVariableName,
	type ResultKind
} from "./utils.ts"

export type ParseResult = type | Error | unset

export declare namespace ParseResult {
	export type Props = {
		parsed: ParseResult
		restoreDefault: () => void
	}
}

export const ParseResult = ({ parsed, restoreDefault }: ParseResult.Props) => {
	const resultKind: ResultKind =
		parsed instanceof Type ? "success"
			// unset is considered a failure in this case
		: "failure"

	const title =
		parsed instanceof Type ? "Type"
		: parsed instanceof Error ? parsed.name
		: "ReferenceError"

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
						Define a <code>Type</code> called{" "}
						<code>"{playgroundTypeVariableName}"</code> to enable introspection:
						<RestoreDefault onClick={restoreDefault} />
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
