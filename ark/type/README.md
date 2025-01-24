<h1 align="center">ArkType <sub><sup>TypeScript's 1:1 validator</sup></sub></h1>

## What is it?

<p>ArkType is a runtime validation library that can infer <b>TypeScript definitions 1:1</b> and reuse them as <b>highly-optimized validators</b> for your data.</p>

<p>With each character you type, you'll get <b>immediate feedback from your editor</b> in the form of either a fully-inferred <code>Type</code> or a specific and helpful <code>ParseError</code>.</p>

<p>This result exactly mirrors what you can expect to happen at runtime down to the punctuation of the error message- <b>no plugins required</b>.</p>

Check out [how it works](#how) or [scroll slightly](#install) to read about installation.

<a id="install" />

## Install

<img src="./ark/docs/src/assets/npm.svg" alt="Npm Icon" height="16px" /> <code>npm install arktype</code>
<sub>(or whatever package manager you prefer)</sub>
<br />

Our types are tested in [strict-mode](https://www.typescriptlang.org/tsconfig#strict) with TypeScript version `5.4+`, although you will likely have success with other versions after 5.0.

If your types work but you notice errors in node_modules, this could be due to `tsconfig` incompatibilities- please enable `compilerOptions/skipLibCheck` ([docs](https://www.typescriptlang.org/tsconfig/#skipLibCheck)).

## Your first type

Defining basic types in ArkType is just like TypeScript, so if you already know how to do that, congratulations! You already know most of ArkType's syntax 🎉

For an ever better in-editor developer experience, try the [ArkDark VSCode extension](https://marketplace.visualstudio.com/items?itemName=arktypeio.arkdark) for syntax highlighting.

```ts
import { type } from "arktype"

// Definitions are statically parsed and inferred as TS
export const user = type({
	name: "string",
	device: {
		platform: "'android'|'ios'",
		"version?": "number"
	}
})

// Validators return typed data or clear, customizable errors.
export const out = user({
	name: "Alan Turing",
	device: {
		// errors.summary: "device/platform must be 'android' or 'ios' (was 'enigma')"
		platform: "enigma"
	}
})

if (out instanceof type.errors) {
	// a clear, user-ready error message, even for complex unions and intersections
	console.log(out.summary)
} else {
	// your valid data!
	console.log(out)
}
```

## Example syntax

Lots more docs are on the way, but I want to highlight some of the most useful syntax patterns/features that are carried over from alpha as well as those new to the 2.0 release.

```ts
// Syntax carried over from 1.0 + TS
export const currentTsSyntax = type({
	keyword: "null",
	stringLiteral: "'TS'",
	numberLiteral: "5",
	bigintLiteral: "5n",
	union: "string|number",
	intersection: "boolean&true",
	array: "Date[]",
	grouping: "(0|1)[]",
	objectLiteral: {
		nested: "string",
		"optional?": "number"
	},
	tuple: ["number", "number"]
})

// available syntax new to 2.0

export const upcomingTsSyntax = type({
	keyof: "keyof object",
	variadicTuples: ["true", "...", "false[]"]
})

// runtime-specific syntax and builtin keywords with great error messages

export const validationSyntax = type({
	keywords: "email|uuid|creditCard|integer", // and many more
	builtinParsers: "parse.date", // parses a Date from a string
	nativeRegexLiteral: /@arktype\.io/,
	embeddedRegexLiteral: "email&/@arktype\\.io/",
	divisibility: "number%10", // a multiple of 10
	bound: "alpha>10", // an alpha-only string with more than 10 characters
	range: "1<=email[]<100", // a list of 1 to 99 emails
	narrows: ["number", ":", n => n % 2 === 1], // an odd integer
	morphs: ["string", "=>", parseFloat] // validates a string input then parses it to a number
})

// root-level expressions

const intersected = type({ value: "string" }, "&", { format: "'bigint'" })

// chained expressions via .or, .and, .narrow, .pipe and much more
//  (these replace previous helper methods like union and intersection)

const user = type({
	name: "string",
	age: "number"
})

const parseUser = type("string").pipe(s => JSON.parse(s), user)

// type is fully introspectable and traversable, displayed as:
type ParseUser = Type<
	(In: string) => Out<{
		name: string
		age: number
	}>
>

const maybeMe = parseUser('{ "name": "David" }')

if (maybeMe instanceof type.errors) {
	// "age must be a number (was missing)"
	console.log(maybeMe.summary)
}
```

There's so much more I want to share but I want to get at least an initial version of the 2.0 branch merged tonight so look forward to that next week!

## API

ArkType supports many of TypeScript's built-in types and operators, as well as some new ones dedicated exclusively to runtime validation. In fact, we got a little ahead of ourselves and built a ton of cool features, but we're still working on getting caught up syntax and API docs. Keep an eye out for more in the next couple weeks ⛵

In the meantime, check out the examples here and use the type hints you get to learn how you can customize your types and scopes. If you want to explore some of the more advanced features, take a look at [our unit tests](./ark/type/__tests__) or ask us [on Discord](https://discord.gg/xEzdc3fJQC) if your functionality is supported. If not, [create a GitHub issue](https://github.com/arktypeio/arktype/issues/new) so we can prioritize it!

## Integrations

### tRPC

ArkType can easily be used with tRPC via the `assert` prop:

```ts
t.procedure.input(
	type({
		name: "string",
		"age?": "number"
	}).assert
)
```

## How?

ArkType's isomorphic parser has parallel static and dynamic implementations. This means as soon as you type a definition in your editor, you'll know the eventual result at runtime.

If you're curious, below is an example of what that looks like under the hood. If not, close that hood back up, `npm install arktype` and enjoy top-notch developer experience 🧑‍💻

```ts
export const parseOperator = (s: DynamicState): void => {
	const lookahead = s.scanner.shift()
	return (
		lookahead === "" ? s.finalize()
		: lookahead === "[" ?
			s.scanner.shift() === "]" ?
				s.rootToArray()
			:	s.error(incompleteArrayTokenMessage)
		: isKeyOf(lookahead, Scanner.branchTokens) ? s.pushRootToBranch(lookahead)
		: lookahead === ")" ? s.finalizeGroup()
		: isKeyOf(lookahead, Scanner.comparatorStartChars) ?
			parseBound(s, lookahead)
		: lookahead === "%" ? parseDivisor(s)
		: lookahead === " " ? parseOperator(s)
		: throwInternalError(writeUnexpectedCharacterMessage(lookahead))
	)
}

export type parseOperator<s extends StaticState> =
	s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned> ?
		lookahead extends "[" ?
			unscanned extends Scanner.shift<"]", infer nextUnscanned> ?
				state.setRoot<s, [s["root"], "[]"], nextUnscanned>
			:	error<incompleteArrayTokenMessage>
		: lookahead extends Scanner.BranchToken ?
			state.reduceBranch<s, lookahead, unscanned>
		: lookahead extends ")" ? state.finalizeGroup<s, unscanned>
		: lookahead extends Scanner.ComparatorStartChar ?
			parseBound<s, lookahead, unscanned>
		: lookahead extends "%" ? parseDivisor<s, unscanned>
		: lookahead extends " " ? parseOperator<state.scanTo<s, unscanned>>
		: error<writeUnexpectedCharacterMessage<lookahead>>
	:	state.finalize<s>
```

## Contributions

We accept and encourage pull requests from outside ArkType.

Depending on your level of familiarity with type systems and TS generics, some parts of the codebase may be hard to jump into. That said, there's plenty of opportunities for more straightforward contributions.

If you're planning on submitting a non-trivial fix or a new feature, please [create an issue first](https://github.com/arktypeio/arktype/issues/new) so everyone's on the same page. The last thing we want is for you to spend time on a submission we're unable to merge.

When you're ready, check out our [guide](./.github/CONTRIBUTING.md) to get started!

## License

This project is licensed under the terms of the
[MIT license](./LICENSE).

## Collaboration

I'd love to hear about what you're working on and how ArkType can help. Please reach out to david@arktype.io.

## Code of Conduct

We will not tolerate any form of disrespect toward members of our community. Please refer to our [Code of Conduct](./.github/CODE_OF_CONDUCT.md) and reach out to david@arktype.io immediately if you've seen or experienced an interaction that may violate these standards.

## Sponsorship

We've been working full-time on this project for over a year and it means a lot to have the community behind us.

If the project has been useful to you and you are in a financial position to do so, please chip in via [GitHub Sponsors](https://github.com/sponsors/arktypeio).

Otherwise, consider sending me an email (david@arktype.io) or [message me on Discord](https://arktype.io/discord) to let me know you're a fan of ArkType. Either would make my day!

### ArkSponsors ⛵

<table>
	<tr>
		<th>sam-goodwin</th>
		<th>fubhy</th>
	</tr>
	<tr>
		<td>
			<a href="https://github.com/sam-goodwin"
				><img
					height="64px"
					src="https://avatars.githubusercontent.com/u/38672686"
			/></a>
		</td>
		<td>
			<a href="https://github.com/fubhy"
				><img
					height="64px"
					src="https://avatars.githubusercontent.com/u/1172528"
			/></a>
		</td>
    </tr>
</table>

### Sponsors 🥰

<table>
	<tr>
		<th>tmm</th>
        <th>mishushakov</th>
        <th>mewhhaha</th>
    	<th>codeandcats</th>
		<th>drwpwrs</th>
	</tr>
	<tr>
		<td>
			<a href="https://github.com/tmm"
				><img
					height="64px"
					src="https://avatars.githubusercontent.com/u/6759464"
			/></a>
		</td>
        <td>
    		<a href="https://github.com/mishushakov"
    			><img height="64px" src="https://avatars.githubusercontent.com/u/10400064"
    		/></a>
    	</td>
        <td>
    		<a href="https://github.com/mewhhaha"
    			><img
    				height="64px"
    				src="https://avatars.githubusercontent.com/u/3399205"
    		/></a>
    	</td>
    	<td>
    		<a href="https://github.com/codeandcats"
    			><img
    				height="64px"
    				src="https://avatars.githubusercontent.com/u/6035934"
    		/></a>
    	</td>
		<td>
			<a href="https://github.com/drwpwrs"
				><img
					height="64px"
					src="https://avatars.githubusercontent.com/u/49917220"
			/></a>
		</td>
	</tr>
	<tr>
    	<th>Timeraa</th>
		<th>Phalangers</th>
		<th>WilliamConnatser</th>
		<th>JameEnder</th>
    </tr>
    <tr>
    	<td>
    		<a href="https://github.com/Timeraa"
    			><img
    				height="64px"
    				src="https://avatars.githubusercontent.com/u/29104008"
    		/></a>
    	</td>
		<td>
    		<a href="https://github.com/Phalangers"
    			><img
    				height="64px"
    				src="https://avatars.githubusercontent.com/u/13227796"
    		/></a>
    	</td>
		<td>
    		<a href="https://github.com/WilliamConnatser"
    			><img
    				height="64px"
    				src="https://avatars.githubusercontent.com/u/43946230"
    		/></a>
    	</td>
		<td>
    		<a href="https://github.com/JameEnder"
    			><img
    				height="64px"
    				src="https://avatars.githubusercontent.com/u/47925045"
    		/></a>
		</td>
		<td>
    		<a href="https://github.com/tylim88"
    			><img
    				height="64px"
    				src="https://avatars.githubusercontent.com/u/5227509"
    		/></a>
		</td>
    </tr>
</table>
