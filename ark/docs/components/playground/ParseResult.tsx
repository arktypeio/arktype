import { Type, type type } from "arktype"
import { RestoreDefault } from "./RestoreDefault.tsx"
import {
	backgroundsByResultKind,
	playgroundOutVariableName,
	playgroundTypeVariableName,
	type ResultKind
} from "./utils.ts"

export type ParseResult = type | Error

export declare namespace ParseResult {
	export type Props = {
		parsed: ParseResult
		restoreDefault: () => void
	}
}

export const ParseResult = ({ parsed, restoreDefault }: ParseResult.Props) => {
	const resultKind: ResultKind = parsed instanceof Type ? "success" : "failure"

	const title = parsed instanceof Error ? parsed.name : "Type"

	const contents =
		parsed instanceof Error ?
			parsed instanceof ReferenceError ?
				parsed.message.startsWith(playgroundTypeVariableName) ?
					<>
						Define a <code>Type</code> called{" "}
						<code>"{playgroundTypeVariableName}"</code> to enable introspection.
						<RestoreDefault onClick={restoreDefault} />
					</>
				: parsed.message.startsWith(playgroundOutVariableName) ?
					<>
						Assign the result of <code>{"Thing({})"}</code> to a variable called{" "}
						<code>"{playgroundOutVariableName}"</code> to see it.
						<RestoreDefault onClick={restoreDefault} />
					</>
				:	parsed.message
			:	parsed.message
		:	parsed.expression

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
				{
					<pre className="m-0 whitespace-pre-wrap">
						<code>{contents}</code>
					</pre>
				}
			</div>
		</div>
	)
}
