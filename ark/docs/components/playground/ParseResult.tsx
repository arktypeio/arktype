import { tryCatch } from "@ark/util"
import { Type, type type } from "arktype"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import { RestoreDefault } from "./RestoreDefault.tsx"
import {
	backgroundsByResultKind,
	playgroundOutVariableName,
	playgroundTypeVariableName,
	type ResultKind
} from "./utils.ts"

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock"

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
			createErrorResult(parsed, restoreDefault)
		:	createTypeResult(parsed)

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
				{contents}
			</div>
		</div>
	)
}

const createErrorResult = (e: Error, restoreDefault: () => void) =>
	e instanceof ReferenceError ?
		e.message.startsWith(playgroundTypeVariableName) ?
			<>
				Define a <code>Type</code> called{" "}
				<code>"{playgroundTypeVariableName}"</code> to enable introspection.
				<RestoreDefault onClick={restoreDefault} />
			</>
		: e.message.startsWith(playgroundOutVariableName) ?
			<>
				Assign the result of <code>{"Thing({})"}</code> to a variable called{" "}
				<code>"{playgroundOutVariableName}"</code> to see it.
				<RestoreDefault onClick={restoreDefault} />
			</>
		:	e.message
	:	e.message

const TabDescription = ({ children }: { children: React.ReactNode }) => (
	<p className="mb-2 text-sm">{children}</p>
)

const createTypeResult = (t: Type) => (
	<Tabs
		items={[
			".expression",
			".description",
			".toJsonSchema()",
			".json",
			".precompilation"
		]}
	>
		<Tab value=".expression">
			<TabDescription>
				A syntax string similar to native TypeScript
			</TabDescription>
			<DynamicCodeBlock lang="ts" code={t.expression} />
		</Tab>
		<Tab value=".description">
			<TabDescription>A human-readable English description</TabDescription>
			<DynamicCodeBlock lang="ts" code={t.description} />
		</Tab>
		<Tab value=".toJsonSchema()">
			<TabDescription>JSON Schema this generates</TabDescription>
			<DynamicCodeBlock
				lang="json"
				code={tryCatch(
					() => JSON.stringify(t.toJsonSchema(), null, 4),
					e => String(e)
				)}
			/>
		</Tab>
		<Tab value=".json">
			<TabDescription>
				A serialized representation of the Type's internal structure
			</TabDescription>
			<DynamicCodeBlock lang="json" code={JSON.stringify(t.json, null, 4)} />
		</Tab>
		<Tab value=".precompilation">
			<TabDescription>JIT-optimized validation code</TabDescription>
			<DynamicCodeBlock lang="js" code={t.precompilation!} />
		</Tab>
	</Tabs>
)
