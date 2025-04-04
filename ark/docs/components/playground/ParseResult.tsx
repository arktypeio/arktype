import { tryCatch } from "@ark/util"
import type { Type, type } from "arktype"
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock"
import React from "react"
import { Tab, Tabs } from "./PlaygroundTabs.tsx"
import { RestoreDefault } from "./RestoreDefault.tsx"
import {
	backgroundsByResultKind,
	playgroundOutVariableName,
	playgroundTypeVariableName
} from "./utils.ts"

export type ParseResult = type | Error

export declare namespace ParseResult {
	export type Props = {
		parsed: ParseResult
		restoreDefault: () => void
	}
}

export const ParseResult = ({ parsed, restoreDefault }: ParseResult.Props) => {
	const title = parsed instanceof Error ? parsed.name : "Type"

	const contents =
		parsed instanceof Error ?
			createErrorResult(parsed, restoreDefault)
		:	createTypeResult(parsed)

	return (
		<div
			style={{
				backgroundColor:
					parsed instanceof Error ?
						backgroundsByResultKind.failure
					:	backgroundsByResultKind.none
			}}
			className="glass-container editor-bg h-full p-4 rounded-2xl"
		>
			<h3 className="text-3xl text-fd-foreground font-semibold mb-2">
				{title}
			</h3>
			{contents}
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
		style={{
			maxHeight: "400px",
			overflow: "auto"
		}}
	>
		<Tab value=".expression">
			<TabDescription>
				Syntactic string similar to native TypeScript
			</TabDescription>
			<DynamicCodeBlock lang="ts" code={t.expression} />
		</Tab>
		<Tab value=".description">
			<TabDescription>
				Human-readable descriptions used for error messages
			</TabDescription>
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
				Serialized representation of the Type's internal structure
			</TabDescription>
			<DynamicCodeBlock lang="json" code={JSON.stringify(t.json, null, 4)} />
		</Tab>
		<Tab value=".precompilation">
			<TabDescription>JIT-optimized validation code</TabDescription>
			<DynamicCodeBlock lang="js" code={t.precompilation!} />
		</Tab>
	</Tabs>
)
