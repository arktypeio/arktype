<p align="center">
	<a href="https://arktype.io">
		<img
			src="https://arktype.io/3/image/og.png"
			width="720"
			alt="ArkType — TypeScript's smallest, fastest validator. One prompt away."
		/>
	</a>
</p>

<p align="center">
	<a href="https://arktype.io/docs/intro/setup"><strong>Docs</strong></a>
	&nbsp;·&nbsp;
	<a href="https://arktype.io/#board">Benchmarks</a>
	&nbsp;·&nbsp;
	<a href="https://arktype.io/docs/precompile">Precompile</a>
	&nbsp;·&nbsp;
	<a href="https://arktype.io/docs/migrating">Migrate from Zod</a>
	&nbsp;·&nbsp;
	<a href="https://arktype.io/playground">Playground</a>
	&nbsp;·&nbsp;
	<a href="https://arktype.io/discord">Discord</a>
</p>

## Quick start

```sh
npm install arktype
```

Write definitions in TypeScript's own syntax — inferred 1:1 and validated at runtime. Works with anything that takes [Standard Schema](https://standardschema.dev) (tRPC, Hono, React Hook Form, Drizzle, AI SDK, MCP SDK, and more).

```ts
import { type } from "arktype"

const User = type({
	name: "string > 0",
	email: "string.email",
	"age?": "number.integer >= 0"
})

// { name: string; email: string; age?: number }
type User = typeof User.infer

const out = User({ name: "Ada", email: "ada@", age: -1 })

if (out instanceof type.errors) {
	// email must be an email address
	// age must be non-negative
	console.error(out.summary)
} else {
	// out is a User
	console.log(out.name)
}
```

## Migrate with one prompt

1. Add the ArkType [agent skill](https://arktype.io/docs/agents):

   ```sh
   npx skills add arktypeio/arktype
   ```

2. Ask your coding agent:

   ```text
   Migrate this project from Zod to ArkType.
   ```

See the [migration guide](https://arktype.io/docs/migrating) for Zod, Valibot, TypeBox, Yup, Joi, Effect Schema, and JSON Schema.

## Docs

- **[Get started](https://arktype.io/docs/intro/setup)** — installation, editor setup, and your first type
- **[Precompile](https://arktype.io/docs/precompile)** — compile Types at build time with `@ark/aot`
- **[Benchmarks](https://arktype.io/#board)** — speed, startup, and bundle size, with methods and rerun commands
- **[Migration guide](https://arktype.io/docs/migrating)** — from Zod, Valibot, TypeBox, Yup, Joi, Effect Schema, and JSON Schema
- **[With agents](https://arktype.io/docs/agents)** — the skill and Markdown docs at [arktype.io/llms.txt](https://arktype.io/llms.txt)
- **[What's new in 3.0](https://arktype.io/docs/blog/3.0)** — release notes and [upgrading from 2.x](https://arktype.io/docs/upgrading)

## CLI

`arktype` ships the `ark` binary (`init`, `migrate`, `skill`, and `check` / `emit` / `declare` via `@ark/aot`). Inside an installed project, run `pnpm exec ark` (or `npx arktype` everywhere — `ark` on npm is an unrelated package):

```sh
npx arktype init     # create ark.json and install the bundled skill
npx arktype migrate  # install the skill and print a migration prompt
npx arktype check    # run @ark/aot --check
```

## Contributions

We accept and encourage pull requests from outside ArkType. Planned work is tracked in [this GitHub project](https://github.com/orgs/arktypeio/projects/4).

Depending on your level of familiarity with type systems and TS generics, some parts of the codebase may be hard to jump into. That said, there's plenty of opportunities for more straightforward contributions. We'd generally recommend starting with one of these issues labeled [external-contributor-friendly](https://github.com/orgs/arktypeio/projects/4/?filterQuery=label%3A%22external-contributor-friendly%22).

If you're planning on submitting a non-trivial fix or a new feature, please [create an issue first](https://github.com/arktypeio/arktype/issues/new) so everyone's on the same page. The last thing we want is for you to spend time on a submission we're unable to merge.

When you're ready, check out our [guide](https://github.com/arktypeio/arktype/blob/main/.github/CONTRIBUTING.md) to get started!

## License

This project is licensed under the terms of the
[MIT license](https://github.com/arktypeio/arktype/blob/main/LICENSE).

## Code of Conduct

We will not tolerate any form of disrespect toward members of our community. Please refer to our [Code of Conduct](https://github.com/arktypeio/arktype/blob/main/.github/CODE_OF_CONDUCT.md) and reach out to david@arktype.io immediately if you've seen or experienced an interaction that may violate these standards.

## Sponsorship

We've been working full-time on this project for multiple years and it means a lot to have the community behind us.

If the project has been useful to you and you are in a financial position to do so, please chip in via [GitHub Sponsors](https://github.com/sponsors/arktypeio).

Otherwise, consider sending me an email (david@arktype.io) or [message me on Discord](https://arktype.io/discord) to let me know you're a fan of ArkType. Either would make my day!

### ArkSponsors ⛵

<table>
    <tr>
        <th>get-convex</th>
    </tr>
    <tr>
        <td>
            <a href="https://github.com/get-convex"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/get-convex"
            /></a>
        </td>
    </tr>
</table>

### Sponsors 🥰

<table>
    <tr>
        <th>mewhhaha</th>
        <th>jahands</th>
        <th>Phalangers</th>
        <th>WilliamConnatser</th>
        <th>JameEnder</th>
    </tr>
    <tr>
        <td>
            <a href="https://github.com/mewhhaha"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/mewhhaha"
            /></a>
        </td>
        <td>
            <a href="https://github.com/jahands"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/jahands"
            /></a>
        </td>
        <td>
            <a href="https://github.com/Phalangers"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/Phalangers"
            /></a>
        </td>
        <td>
            <a href="https://github.com/WilliamConnatser"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/WilliamConnatser"
            /></a>
        </td>
        <td>
            <a href="https://github.com/JameEnder"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/JameEnder"
            /></a>
        </td>
    </tr>
    <tr>
        <th>tylim88</th>
        <th>tpetry</th>
        <th>braden-w</th>
    </tr>
    <tr>
        <td>
            <a href="https://github.com/tylim88"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/tylim88"
            /></a>
        </td>
        <td>
            <a href="https://github.com/tpetry"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/tpetry"
            /></a>
        </td>
        <td>
            <a href="https://github.com/braden-w"
                ><img
                    height="64px"
                    src="https://avatars.githubusercontent.com/braden-w"
            /></a>
        </td>
    </tr>
</table>
