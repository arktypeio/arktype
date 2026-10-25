import { tryCatch } from "@ark/util"
import type { Type, type } from "arktype"
import dynamic from "next/dynamic"
import React from "react"
import { ColorizedCode } from "./ColorizedCode.tsx"
import { Tab, Tabs } from "./PlaygroundTabs.tsx"
import { RestoreDefault } from "./RestoreDefault.tsx"
import {
	backgroundsByResultKind,
	playgroundOutVariableName,
	playgroundTypeVariableName
} from "./utils.ts"

export type ParseResult = type | Error

// the standalone writer, the program's second run and the measuring worker
// load only once the tab opens
const PrecompiledResult = dynamic(
	() =>
		import("./PrecompiledResult.tsx").then(module => module.PrecompiledResult),
	{ ssr: false, loading: () => <p className="pc-note">Loading…</p> }
)

export declare namespace ParseResult {
	export type Props = {
		parsed: ParseResult
		restoreDefault: () => void
		/** the editor's code, and that code as it ran */
		source: string
		js?: string | undefined
	}
}

export const ParseResult = ({
	parsed,
	restoreDefault,
	source,
	js
}: ParseResult.Props) => {
	const title = parsed instanceof Error ? parsed.name : "Type"

	const contents =
		parsed instanceof Error ?
			createErrorResult(parsed, restoreDefault)
		:	createTypeResult(parsed, source, js)

	return (
		<div
			style={{
				backgroundColor:
					parsed instanceof Error ?
						backgroundsByResultKind.failure
					:	backgroundsByResultKind.none
			}}
			className="glass-container editor-bg flex h-full flex-col p-4 rounded-2xl"
		>
			<h2 className="text-3xl text-ink font-semibold mb-2">{title}</h2>
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

const createTypeResult = (t: Type, source: string, js: string | undefined) => (
	<Tabs
		items={[
			".expression",
			".description",
			".toJsonSchema()",
			".json",
			"precompiled"
		]}
		className="min-h-0 flex-1"
		tabListClassName="overflow-x-auto overflow-y-hidden"
	>
		<Tab value=".expression">
			<TabDescription>
				Syntactic string similar to native TypeScript
			</TabDescription>
			<ColorizedCode lang="ts" code={t.expression} />
		</Tab>
		<Tab value=".description">
			<TabDescription>
				Human-readable descriptions used for error messages
			</TabDescription>
			<ColorizedCode lang="ts" code={t.description} />
		</Tab>
		<Tab value=".toJsonSchema()">
			<TabDescription>JSON Schema this generates</TabDescription>
			<ColorizedCode
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
			<ColorizedCode lang="json" code={JSON.stringify(t.json, null, 4)} />
		</Tab>
		<Tab value="precompiled">
			{js === undefined ?
				<TabDescription>Run the code to precompile it</TabDescription>
			:	<PrecompiledResult source={source} js={js} />}
		</Tab>
	</Tabs>
)
