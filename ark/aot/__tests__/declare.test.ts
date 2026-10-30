import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { emitDeclarations } from "@ark/aot/internal/declare.ts"
import { spawnSync } from "node:child_process"
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { join } from "node:path"
import { relative } from "node:path/posix"
import { runCli } from "./utils.ts"

// declarations are keyed by TypeScript's paths, which use / on Windows too
const tsPath = (path: string) => path.split("\\").join("/")

const declared = fromHere("declared")
const layouts = fromHere("declaredLayouts")

const specifiersByLayout = (tsconfig: string) => {
	const declarations = emitDeclarations({ cwd: layouts, tsconfig })
	const specifiersByFile: Record<string, string[]> = {}
	for (const path in declarations.files) {
		specifiersByFile[relative(tsPath(layouts), path)] = [
			...declarations.files[path].matchAll(/import\("([^"]+)"\)/g)
		].map(match => match[1])
	}
	return { errors: declarations.errors, specifiersByFile }
}

// each export a consumer reads as another type than its source's
const inexactExportsOf = (fixture: string, checks: Record<string, string>) => {
	const lines = [
		"type eq<l, r> = (<_>() => _ extends l ? 1 : 2) extends <_>() => _ extends r ? 1 : 2 ? true : false",
		"type inferOf<t> = t extends { infer: infer o; inferIn: infer i } ? [o, i] : t"
	]
	const exportsByLine = lines.map(() => "")
	const check = (name: string, comparison: string) => {
		exportsByLine.push(name)
		lines.push(`export const _${lines.length}: ${comparison} = true`)
	}
	const src = join(fixture, "src")
	for (const file of readdirSync(src, {
		recursive: true,
		encoding: "utf8"
	}).map(tsPath)) {
		if (!file.endsWith(".ts")) continue
		const module = file.slice(0, -3)
		const id = module.replace(/\//g, "_")
		exportsByLine.push("", "")
		lines.push(
			`import type * as ${id}Source from "./src/${file}"`,
			`import type * as ${id}Declared from "./out/${module}.js"`
		)
		const source = readFileSync(join(src, file), "utf8")
		for (const [, name] of source.matchAll(/^export const (\w+)/gm)) {
			check(
				`${module}.${name}`,
				`eq<inferOf<typeof ${id}Declared.${name}>, inferOf<typeof ${id}Source.${name}>>`
			)
		}
	}
	for (const name in checks) check(name, checks[name])
	try {
		runCli(fixture, "--declare")
		writeFileSync(join(fixture, "consumer.ts"), lines.join("\n"))
		const { compilerOptions } = JSON.parse(
			readFileSync(join(fixture, "tsconfig.json"), "utf8")
		)
		writeFileSync(
			join(fixture, "tsconfig.consumer.json"),
			JSON.stringify({
				compilerOptions: {
					...compilerOptions,
					noEmit: true,
					skipLibCheck: false,
					skipDefaultLibCheck: true,
					rootDir: undefined,
					types: ["node"]
				},
				files: ["consumer.ts"]
			})
		)
		const tsc = spawnSync(
			process.execPath,
			[
				fromHere("..", "..", "..", "node_modules", "typescript", "bin", "tsc"),
				"-p",
				"tsconfig.consumer.json"
			],
			{ cwd: fixture, encoding: "utf8" }
		)
		return [...tsc.stdout.matchAll(/^consumer\.ts\((\d+),.*$/gm)].map(
			([text, line]) => exportsByLine[+line - 1] || text
		)
	} finally {
		rmSync(join(fixture, "out"), { recursive: true, force: true })
		rmSync(join(fixture, "consumer.ts"), { force: true })
		rmSync(join(fixture, "tsconfig.consumer.json"), { force: true })
	}
}

contextualize(() => {
	const { files, errors } = emitDeclarations({ cwd: declared })
	const declaredFile = (file: string) =>
		files[tsPath(join(declared, "out", file))]
	const declarationsOf = (file: string, ...names: string[]) =>
		declaredFile(file)
			.split(/\n(?=export |declare )/)
			.filter(declaration => names.includes(declaration.split(/[ :]/)[3] ?? ""))
			.join("\n")
	const shapesOf = (...names: string[]) =>
		declaredFile("~arktype.d.ts")
			.split(/\n(?=export type )/)
			.filter(shape => names.includes(shape.split(" ")[2]))
			.join("\n")

	it("declares Types through shared shapes", () => {
		attest(errors).equals(0)
		attest(declaredFile("users.d.ts"))
			.snap(`export declare const Role: import("arktype").Type<import("./~arktype.js").Role>;
export declare const User: import("arktype").Type<import("./~arktype.js").User>;
export type User = typeof User.infer;
export declare const Team: import("arktype").Type<import("./~arktype.js").Team>;
export declare const parseUser: (data: unknown) => User;
`)
		attest(shapesOf("Role", "User", "Team", "Address"))
			.snap(`export type Address = {
    street: string;
    country: string;
    unit?: string | undefined;
};
export type Role = "admin" | "member";
export type User = {
    id: string;
    role: import("arktype").Default<Role, "member">;
    address?: Address | undefined;
};
export type Team = {
    lead: User;
    members: User[];
};`)
	})

	it("names a shape by its defining const", () => {
		attest(declaredFile("aliases.d.ts"))
			.snap(`export declare const Cash: import("arktype").Type<import("./~arktype.js").Money>;
`)
	})

	it("names a cycle by its key", () => {
		attest(
			shapesOf(
				"Dashed",
				"the_head",
				"Keyword",
				"$string",
				"Holder",
				"$object",
				"Linked",
				"node"
			)
		).snap(`export type Dashed = {
    "the-head": the_head;
};
export type Keyword = {
    string: $string;
    default: $string;
};
export type $object = {
    a: string;
};
export type Holder = {
    inner: $object;
};
export type Linked = {
    head: node;
};
export type the_head = {
    next?: the_head | undefined;
};
export type $string = {
    value: boolean;
    child?: $string | undefined;
};
export type node = {
    value: number;
    next?: node | undefined;
};
`)
	})

	it("submodules, enum members and aliases", () => {
		attest(
			shapesOf(
				"Nested",
				"list",
				"Colors",
				"Reds",
				"Parsed",
				"Length",
				"Branded",
				"ParsedJson"
			)
		).snap(`export type Nested = {
    sub: import("arktype").Submodule<{
        leaf: string;
    }>;
    list: list;
};
export type Colors = import("./enums.js").Color.Red | import("./enums.js").Color.Blue;
export type Reds = {
    color: import("./enums.js").Color.Red;
};
export type Parsed = (In: string) => import("arktype").To<number>;
export type Length = (In: string) => import("arktype").Out<number>;
export type Branded = import("arktype").Brand<string, "id">;
export type ParsedJson = (In: string) => import("arktype").To<import("arktype").Json>;
export type list = {
    value: number;
    rest?: list | undefined;
};`)
	})

	it("declares tuples and readonly keys", () => {
		attest(shapesOf("Pair", "Rest", "Frozen", "Owned"))
			.snap(`export type Pair = [string, (number | undefined)?];
export type Rest = [string, ...number[]];
export type Frozen = {
    readonly at: globalThis.Date;
    readonly "key-with-dash": boolean | null;
};
export type Owned = {
    account: import("./shapes.js").Account;
    length: Length;
};`)
	})

	it("keeps TypeScript's declaration for a local, an expanding shape or an annotation", () => {
		attest(
			declarationsOf("shapes.d.ts", "Held", "Sessions", "Expanded", "Annotated")
		)
			.snap(`export declare const Held: import("arktype/internal/variants/object.ts").ObjectType<{
    session: Session;
}, {}>;
export declare const Sessions: import("arktype/internal/variants/object.ts").ObjectType<{
    head: {
        session: Session;
        next?: /*elided*/ any | undefined;
    };
}, {
    node: {
        session: Session;
        next?: /*elided*/ any | undefined;
    };
}>;
export declare const Expanded: import("arktype/internal/variants/object.ts").ObjectType<Expanding<string>, {}>;
export declare const Annotated: BaseType<{
    a: string;
}>;`)
	})

	it("names globals, Node and augmented types", () => {
		attest(shapesOf("Emitting", "Streaming", "Buffered", "Augmented"))
			.snap(`export type Augmented = {
    extra: import("./nested/base.js").Extra;
};
export type Emitting = {
    emitter: import("events").EventEmitter<[never]>;
};
export type Streaming = {
    stream: import("stream").Readable;
};
export type Buffered = {
    buffer: globalThis.Buffer<globalThis.ArrayBuffer | globalThis.SharedArrayBuffer>;
};`)
	})

	it("skips an unreadable TypeScript", () => {
		const loader = fromHere("temp", "loader")
		const stub = join(loader, "node_modules", "typescript")
		try {
			mkdirSync(join(loader, "src"), { recursive: true })
			mkdirSync(stub, { recursive: true })
			writeFileSync(join(loader, "package.json"), "{}")
			writeFileSync(
				join(loader, "tsconfig.json"),
				readFileSync(join(declared, "tsconfig.json"))
			)
			writeFileSync(
				join(loader, "src", "index.ts"),
				'import { type } from "arktype"\n\nexport const Id = type({ id: "string" })\n'
			)
			writeFileSync(join(stub, "package.json"), '{ "main": "index.js" }')
			const shapesWith = (version: string) => {
				writeFileSync(
					join(stub, "index.js"),
					`module.exports = { version: "${version}" }`
				)
				return emitDeclarations({ cwd: loader }).shapes
			}
			// TypeScript 7 has no compiler API, and 5.4 lacks what this reads
			attest([shapesWith("7.0.0"), shapesWith("5.4.5")]).equals([1, 1])
		} finally {
			rmSync(loader, { recursive: true, force: true })
		}
	}).timeout(60000)

	it("omits exactOptionalPropertyTypes' undefined", () => {
		const exact = fromHere("declaredExact")
		attest(
			emitDeclarations({ cwd: exact }).files[
				tsPath(join(exact, "out", "~arktype.d.ts"))
			]
		).snap(`// the shapes of this build's Types, Scopes and Modules
export type Optional = {
    a?: string;
    b?: string | undefined;
};
export type Elements = [string, number?];
`)
	})

	it("lays declarations out as each tsconfig does", () => {
		attest(
			[
				"tsconfig.json",
				"tsconfig.outDir.json",
				"tsconfig.declarationDir.json",
				"tsconfig.composite.json"
			].map(specifiersByLayout)
		).snap([
			// beside their sources
			{
				errors: 0,
				specifiersByFile: {
					"src/index.d.ts": ["arktype", "../~arktype.js"],
					"src/nested/accounts.d.ts": ["arktype", "../../~arktype.js"],
					"~arktype.d.ts": [
						"./src/nested/accounts.js",
						"./src/nested/accounts.js"
					]
				}
			},
			// in outDir, without rootDir
			{
				errors: 1,
				specifiersByFile: {
					"out/src/index.d.ts": ["arktype", "../~arktype.js"],
					"out/src/nested/accounts.d.ts": ["arktype", "../../~arktype.js"],
					"out/~arktype.d.ts": [
						"./src/nested/accounts.js",
						"./src/nested/accounts.js"
					]
				}
			},
			// in declarationDir
			{
				errors: 0,
				specifiersByFile: {
					"types/index.d.ts": ["arktype", "./~arktype.js"],
					"types/nested/accounts.d.ts": ["arktype", "../~arktype.js"],
					"types/~arktype.d.ts": [
						"./nested/accounts.js",
						"./nested/accounts.js"
					]
				}
			},
			// a composite project's
			{
				errors: 0,
				specifiersByFile: {
					"out/src/index.d.ts": ["arktype", "../~arktype.js"],
					"out/src/nested/accounts.d.ts": ["arktype", "../../~arktype.js"],
					"out/~arktype.d.ts": [
						"./src/nested/accounts.js",
						"./src/nested/accounts.js"
					]
				}
			}
		])
	}).timeout(60000)

	it("refuses a module declared where the shapes are", () => {
		const collision = fromHere("declaredCollision")
		const file = tsPath(join(collision, "src", "~arktype.ts"))
		attest(() => emitDeclarations({ cwd: collision })).throws(
			`${file} would be declared at ~arktype.d.ts, which holds the shapes of the build's Types. Rename ${file}.`
		)
	})

	it("fails from the CLI for a tsconfig TypeScript reports", () => {
		try {
			const cli = runCli(
				layouts,
				"--declare",
				"--tsconfig",
				"tsconfig.broken.json"
			)
			attest({
				status: cli.status,
				stdout: cli.stdout,
				stderr: cli.stderr
			}).snap({
				status: 1,
				stdout: "3 declaration files in out, with 2 shapes in ~arktype.d.ts\n",
				stderr:
					"tsconfig.broken.json(3,23): error TS5023: Unknown compiler option 'notAnOption'.\n\n"
			})
		} finally {
			rmSync(join(layouts, "out"), { recursive: true, force: true })
		}
	}).timeout(60000)

	it("refuses the CLI's other modes and options with --declare", () => {
		const cli = runCli(layouts, "--declare", "--check", "--preset", "smallest")
		attest([cli.status, cli.stderr.split("\n")[0]]).snap([
			2,
			"--declare emits the tsconfig's program and takes no files or option but --tsconfig (was --check --preset)"
		])
	})

	it("prints the CLI's usage for --help or an option it doesn't take", () => {
		const help = runCli(layouts, "--help")
		const watch = runCli(layouts, "--watch")
		// the first line is node:util's parseArgs message
		const [unknown, ...usage] = watch.stderr.split("\n")
		attest([help.status, help.stderr, watch.status, usage.join("\n")]).equals([
			0,
			"",
			2,
			help.stdout
		])
		attest(unknown).satisfies(/^Unknown option '--watch'/)
		attest(help.stdout).satisfies(/^Usage: arktype-precompile --check /)
	})

	it("CLI declarations read as their sources", () => {
		// a declared enum differs from its source, and TypeScript elides cycles to any
		attest(
			inexactExportsOf(declared, {
				"enums.Colors of the declared enum":
					"eq<typeof enumsDeclared.Colors.infer, enumsDeclared.Color.Red | enumsDeclared.Color.Blue>",
				"enums.Reds of the declared enum":
					"eq<typeof enumsDeclared.Reds.infer, { color: enumsDeclared.Color.Red }>"
			})
		).snap(["enums.Colors", "enums.Reds", "shapes.Sessions"])
	}).timeout(120000)

	it("CLI declarations under exactOptionalPropertyTypes", () => {
		attest(inexactExportsOf(fromHere("declaredExact"), {})).snap([])
	}).timeout(120000)
})
