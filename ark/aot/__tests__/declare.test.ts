import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	checkers,
	emitDeclarations,
	type Checker
} from "@ark/aot/internal/declare.ts"
import { spawnSync } from "node:child_process"
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { join } from "node:path"
import { relative } from "node:path/posix"
import { inexactExportsOf, runCli, tsPath } from "./utils.ts"

const declared = fromHere("declared")
const layouts = fromHere("declaredLayouts")
const cycles = fromHere("declaredCycles")

type OwnDeclarations = {
	version: string
	// each export a TS5088 names, by its module
	cyclicByModule: Record<string, string[]>
	// how many times each declaration file writes `/*elided*/ any`
	elidedByFile: Record<string, number>
}

// what `tsc --emitDeclarationOnly` of the TypeScript at a path makes of the cycles
const ownDeclarationsOf = (typescript: string): OwnDeclarations => {
	const out = join(cycles, "out")
	try {
		const tsc = spawnSync(
			process.execPath,
			[
				join(typescript, "bin", "tsc"),
				"--declaration",
				"--emitDeclarationOnly"
			],
			{ cwd: cycles, encoding: "utf8" }
		)
		const cyclicByModule: Record<string, string[]> = {}
		for (const [, module, name] of tsc.stdout.matchAll(
			/^src\/(\w+)\.ts\(.*error TS5088: The inferred type of '(.+)' references/gm
		))
			(cyclicByModule[module] ??= []).push(name)
		const elidedByFile: Record<string, number> = {}
		// TypeScript writes no declaration for a module it reports
		for (const file of existsSync(out) ? readdirSync(out).sort() : []) {
			const elided = readFileSync(join(out, file), "utf8").split(
				"/*elided*/ any"
			)
			if (elided.length > 1) elidedByFile[file] = elided.length - 1
		}
		return {
			version: JSON.parse(
				readFileSync(join(typescript, "package.json"), "utf8")
			).version,
			cyclicByModule,
			elidedByFile
		}
	} finally {
		rmSync(out, { recursive: true, force: true })
	}
}

const specifiersByLayout = (tsconfig: string, checker: Checker) => {
	const declarations = emitDeclarations({ cwd: layouts, tsconfig, checker })
	const specifiersByFile: Record<string, string[]> = {}
	for (const path in declarations.files) {
		specifiersByFile[relative(tsPath(layouts), path)] = [
			...declarations.files[path].matchAll(/import\("([^"]+)"\)/g)
		].map(match => match[1])
	}
	return { errors: declarations.errors, specifiersByFile }
}

contextualize(() => {
	for (const checker of checkers) {
		describe(checker, () => {
			const { files, errors, diagnostics } = emitDeclarations({
				cwd: declared,
				checker
			})
			const declaredFile = (file: string) =>
				files[tsPath(join(declared, "out", file))]
			const declarationsOf = (file: string, ...names: string[]) =>
				declaredFile(file)
					.split(/\n(?=export |declare )/)
					.filter(declaration =>
						names.includes(declaration.split(/[ :]/)[3] ?? "")
					)
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
				const shapes = shapesOf("Role", "User", "Team", "Address")
				// TypeScript 7 orders keys as it declares them itself, where 6 lists optional keys last
				if (checker === "tsjs") {
					attest(shapes).snap(`export type Address = {
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
				} else {
					attest(shapes).snap(`export type Address = {
    street: string;
    unit?: string | undefined;
    country: string;
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
				}
			})

			it("names a shape by its defining const", () => {
				attest(declaredFile("aliases.d.ts"))
					.snap(`export declare const Cash: import("arktype").Type<import("./~arktype.js").Money>;
`)
			})

			it("names a cycle by its alias, whatever key reads it", () => {
				attest(
					shapesOf(
						"Dashed",
						"link",
						"Keyword",
						"tree",
						"Holder",
						"$object",
						"Linked",
						"node"
					)
				).snap(`export type Dashed = {
    "the-head": link;
};
export type Keyword = {
    string: tree;
    default: tree;
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
export type link = {
    next?: link | undefined;
};
export type tree = {
    value: boolean;
    child?: tree | undefined;
};
export type node = {
    value: number;
    next?: node | undefined;
};
`)
			})

			it("submodules, enum members and aliases", () => {
				const shapes = shapesOf(
					"Nested",
					"list",
					"Colors",
					"Reds",
					"Parsed",
					"Length",
					"Branded",
					"ParsedJson"
				)
				// TypeScript 7 orders keys as it declares them itself, where 6 lists optional keys last
				if (checker === "tsjs") {
					attest(shapes).snap(`export type Nested = {
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
				} else {
					attest(shapes).snap(`export type Nested = {
    list: list;
    sub: import("arktype").Submodule<{
        leaf: string;
    }>;
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
				}
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
					declarationsOf(
						"shapes.d.ts",
						"Held",
						"Sessions",
						"Expanded",
						"Annotated"
					)
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

			it("warns of a cycle left to TypeScript, which declares it as any", () => {
				// Sessions' cycle holds a class its module doesn't export
				attest(errors).equals(0)
				attest(diagnostics)
					.snap(`src/shapes.ts: warning: Sessions is declared with any where its type refers to itself, which TypeScript can't write. Bind the Type, Scope or Module it holds to a top-level const, export each class its definition names, or annotate Sessions.
`)
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

			it("escapes a module name in a shape's import", () => {
				const quoted = fromHere("temp", "quoted")
				try {
					mkdirSync(join(quoted, "src"), { recursive: true })
					writeFileSync(
						join(quoted, "tsconfig.json"),
						readFileSync(join(declared, "tsconfig.json"))
					)
					writeFileSync(
						join(quoted, "src", "ambient.d.ts"),
						"declare module 'a\"b\\\\c' {\n\texport class Quoted {\n\t\ta: string\n\t}\n}\n"
					)
					writeFileSync(
						join(quoted, "src", "index.ts"),
						'import { type } from "arktype"\nimport { Quoted } from \'a"b\\\\c\'\n\nexport const Q = type({ q: type.instanceOf(Quoted) })\n'
					)
					attest(
						emitDeclarations({ cwd: quoted, checker }).files[
							tsPath(join(quoted, "out", "~arktype.d.ts"))
						]
					).snap(`// the shapes of this build's Types, Scopes and Modules
export type Q = {
    q: import("a\\"b\\\\c").Quoted;
};
`)
				} finally {
					rmSync(quoted, { recursive: true, force: true })
				}
			}).timeout(60000)

			it("omits exactOptionalPropertyTypes' undefined", () => {
				const exact = fromHere("declaredExact")
				const exactFile = (file: string) =>
					emitDeclarations({ cwd: exact, checker }).files[
						tsPath(join(exact, "out", file))
					]
				const shapes = exactFile("~arktype.d.ts")
				// TypeScript 7 orders keys as it declares them itself, where 6 lists optional keys last
				if (checker === "tsjs") {
					attest(shapes)
						.snap(`// the shapes of this build's Types, Scopes and Modules
export type Draft = {
    count: import("arktype").Default<number, 0>;
    title?: string;
    tags?: string[] | undefined;
    parent?: Optional;
};
export type Optional = {
    a?: string;
    b?: string | undefined;
};
export type Elements = [string, number?];
export type DraftIn = {
    title?: string;
    tags?: string[] | undefined;
    parent?: Optional;
    count?: number;
};
export type DraftOut = {
    count: number;
    title?: string;
    tags?: string[] | undefined;
    parent?: Optional;
};
`)
				} else {
					attest(shapes)
						.snap(`// the shapes of this build's Types, Scopes and Modules
export type Draft = {
    title?: string;
    tags?: string[] | undefined;
    count: import("arktype").Default<number, 0>;
    parent?: Optional;
};
export type Optional = {
    a?: string;
    b?: string | undefined;
};
export type Elements = [string, number?];
export type DraftIn = {
    title?: string;
    tags?: string[] | undefined;
    parent?: Optional;
    count?: number;
};
export type DraftOut = {
    title?: string;
    tags?: string[] | undefined;
    count: number;
    parent?: Optional;
};
`)
				}
				// in an optional key or element another declaration holds, too
				attest(exactFile("held.d.ts"))
					.snap(`export declare const Draft: import("arktype").Type<import("./~arktype.js").Draft>;
export declare const draft: {
    input?: import("./~arktype.js").DraftIn;
    output?: import("./~arktype.js").DraftOut | undefined;
    either?: import("./~arktype.js").DraftIn | import("./~arktype.js").DraftOut;
    pair: [import("./~arktype.js").DraftOut, import("./~arktype.js").DraftIn?];
};
export declare const optional: {
    input?: import("./~arktype.js").Optional;
    output?: import("./~arktype.js").Optional | undefined;
    either?: import("./~arktype.js").Optional;
    pair: [import("./~arktype.js").Optional, import("./~arktype.js").Optional?];
};
`)
			})

			it("lays declarations out as each tsconfig does", () => {
				attest(
					[
						"tsconfig.json",
						"tsconfig.outDir.json",
						"tsconfig.declarationDir.json",
						"tsconfig.composite.json"
					].map(tsconfig => specifiersByLayout(tsconfig, checker))
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
					// in outDir, without rootDir, which TypeScript 6 reports
					{
						errors: checker === "tsjs" ? 1 : 0,
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
				attest(() => emitDeclarations({ cwd: collision, checker })).throws(
					`${file} would be declared at ~arktype.d.ts, which holds the shapes of the build's Types. Rename ${file}.`
				)
			})

			it("fails from the CLI for a tsconfig TypeScript reports", () => {
				try {
					const cli = runCli(
						layouts,
						"--declare",
						"--checker",
						checker,
						"--tsconfig",
						"tsconfig.broken.json"
					)
					attest({
						status: cli.status,
						stdout: cli.stdout,
						stderr: cli.stderr
					}).snap({
						status: 1,
						stdout:
							"3 declaration files in out, with 2 shapes in ~arktype.d.ts\n",
						stderr:
							"tsconfig.broken.json(3,23): error TS5023: Unknown compiler option 'notAnOption'.\n\n"
					})
				} finally {
					rmSync(join(layouts, "out"), { recursive: true, force: true })
				}
			}).timeout(60000)

			it("CLI declarations read as their sources", () => {
				// a declared enum differs from its source, and TypeScript elides cycles to any
				attest(
					inexactExportsOf(
						declared,
						{
							"enums.Colors of the declared enum":
								"eq<typeof enumsDeclared.Colors.infer, enumsDeclared.Color.Red | enumsDeclared.Color.Blue>",
							"enums.Reds of the declared enum":
								"eq<typeof enumsDeclared.Reds.infer, { color: enumsDeclared.Color.Red }>"
						},
						checker
					)
				).snap(["enums.Colors", "enums.Reds", "shapes.Sessions"])
			}).timeout(120000)

			it("CLI declarations under exactOptionalPropertyTypes", () => {
				attest(inexactExportsOf(fromHere("declaredExact"), {}, checker)).snap(
					[]
				)
			}).timeout(120000)

			describe("cyclic scopes", () => {
				const declarations = emitDeclarations({ cwd: cycles, checker })
				const cyclesFile = (file: string) =>
					declarations.files[tsPath(join(cycles, "out", file))]

				it("declares a Module, the function parsing with it and one returning its data", () => {
					attest([declarations.errors, declarations.diagnostics]).equals([
						0,
						""
					])
					attest(cyclesFile("module.d.ts"))
						.snap(`export declare const types: import("arktype").Module<import("./~arktype.js").types>;
export declare const parseUser: (data: unknown) => import("./~arktype.js").user;
export declare function firstFriend(data: typeof types.user.infer, fallback?: string): string | import("./~arktype.js").user | undefined;
`)
				})

				it("declares destructured exports, a default export, a key's Module and a returned Type", () => {
					attest(
						["destructured.d.ts", "default.d.ts", "held.d.ts"]
							.map(cyclesFile)
							.join("")
					)
						.snap(`export declare const post: import("arktype").Type<import("./~arktype.js").post, import("./~arktype.js").postScope>, author: import("arktype").Type<import("./~arktype.js").author, import("./~arktype.js").postScope>;
declare const _default: import("arktype").Module<import("./~arktype.js").$default>;
export default _default;
export declare const schemas: {
    version: number;
    types: import("arktype").Module<import("./~arktype.js").types$2>;
};
export declare const makeTree: () => import("arktype").Type<import("./~arktype.js").makeTree>;
`)
				})

				// `user` is three scopes' alias, and `types` two Modules' name
				it("names each cycle as its scope does, numbering a name another shape took", () => {
					const shapes = cyclesFile("~arktype.d.ts")
					// TypeScript 7 orders a scope's aliases as it declares them itself
					if (checker === "tsjs") {
						attest(shapes)
							.snap(`// the shapes of this build's Types, Scopes and Modules
export type $default = {
    folder: folder;
};
export type post = {
    title: string;
    author: author;
};
export type postScope = {
    post: post;
    author: author;
};
export type author = {
    name: string;
    posts?: post[] | undefined;
};
export type types = {
    user: user;
    group: group;
};
export type admins = {
    user: user$2;
};
export type guests = {
    user: user$3;
};
export type Dashed = {
    head: the_link;
};
export type DashedScope = {
    "the-link": the_link;
};
export type Keyword = {
    root: $new;
};
export type KeywordScope = {
    new: $new;
};
export type $ = {
    "#node": node;
    list: {
        head: node;
    };
};
export type Tree = {
    value: number;
    children?: Tree[] | undefined;
};
export type folder = {
    name: string;
    folders?: folder[] | undefined;
};
export type user = {
    name: string;
    friends?: user[] | undefined;
};
export type group = {
    members: user[];
    parent?: group | undefined;
};
export type user$2 = {
    role: "admin";
    reports?: user$2[] | undefined;
};
export type user$3 = {
    invitedBy?: user$3 | undefined;
};
export type the_link = {
    next?: the_link | undefined;
};
export type $new = {
    value: boolean;
    child?: $new | undefined;
};
export type node = {
    value: number;
    next?: node | undefined;
};
export type types$2 = {
    comment: comment;
};
export type comment = {
    body: string;
    replies?: comment[] | undefined;
};
export type makeTree = {
    value: number;
    children?: makeTree[] | undefined;
};
`)
					} else {
						attest(shapes)
							.snap(`// the shapes of this build's Types, Scopes and Modules
export type $default = {
    folder: folder;
};
export type post = {
    title: string;
    author: author;
};
export type postScope = {
    author: author;
    post: post;
};
export type author = {
    name: string;
    posts?: post[] | undefined;
};
export type types = {
    group: group;
    user: user;
};
export type admins = {
    user: user$2;
};
export type guests = {
    user: user$3;
};
export type Dashed = {
    head: the_link;
};
export type DashedScope = {
    "the-link": the_link;
};
export type Keyword = {
    root: $new;
};
export type KeywordScope = {
    new: $new;
};
export type $ = {
    "#node": node;
    list: {
        head: node;
    };
};
export type Tree = {
    value: number;
    children?: Tree[] | undefined;
};
export type folder = {
    name: string;
    folders?: folder[] | undefined;
};
export type user = {
    name: string;
    friends?: user[] | undefined;
};
export type group = {
    members: user[];
    parent?: group | undefined;
};
export type user$2 = {
    role: "admin";
    reports?: user$2[] | undefined;
};
export type user$3 = {
    invitedBy?: user$3 | undefined;
};
export type the_link = {
    next?: the_link | undefined;
};
export type $new = {
    value: boolean;
    child?: $new | undefined;
};
export type node = {
    value: number;
    next?: node | undefined;
};
export type types$2 = {
    comment: comment;
};
export type comment = {
    body: string;
    replies?: comment[] | undefined;
};
export type makeTree = {
    value: number;
    children?: makeTree[] | undefined;
};
`)
					}
				})

				it("CLI declarations read as their sources", () => {
					attest(
						inexactExportsOf(
							cycles,
							{
								"destructured.post":
									"eq<inferOf<typeof destructuredDeclared.post>, inferOf<typeof destructuredSource.post>>",
								"destructured.author":
									"eq<inferOf<typeof destructuredDeclared.author>, inferOf<typeof destructuredSource.author>>",
								"default.default":
									"eq<typeof defaultDeclared.default, typeof defaultSource.default>",
								"module.firstFriend":
									"eq<typeof moduleDeclared.firstFriend, typeof moduleSource.firstFriend>"
							},
							checker
						)
					).snap([])
				}).timeout(120000)
			})
		})
	}
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

	it("refuses the CLI's other modes and options with --declare", () => {
		const cli = runCli(layouts, "--declare", "--check", "--preset", "smallest")
		attest([cli.status, cli.stderr.split("\n")[0]]).snap([
			2,
			"--declare emits the tsconfig's program and takes no files or option but --tsconfig and --checker (was --check --preset)"
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

	describe("cyclic scopes, as TypeScript declares them", () => {
		// since microsoft/TypeScript#64461, in 7.1's beta. 7.0 wrote `any` as 6
		// does, and so would a 7.1 that reverts it
		it("the repo's TypeScript reports each export reading a cycle and declares none", () => {
			attest(
				ownDeclarationsOf(
					fromHere("..", "..", "..", "node_modules", "typescript")
				)
			).snap({
				version: "7.1.0-beta",
				cyclicByModule: {
					default: ["default"],
					destructured: ["{ post, author }"],
					held: ["schemas", "makeTree"],
					module: ["types", "parseUser", "firstFriend"],
					names: ["admins", "guests", "Dashed", "Keyword", "$", "Tree"]
				},
				elidedByFile: {}
			})
		}).timeout(120000)

		it("TypeScript 6 declares each cycle as any", () => {
			attest(
				ownDeclarationsOf(fromHere("..", "node_modules", "typescript-6"))
			).snap({
				version: "6.0.3",
				cyclicByModule: {},
				elidedByFile: {
					"default.d.ts": 1,
					"destructured.d.ts": 6,
					"held.d.ts": 2,
					"module.d.ts": 5,
					"names.d.ts": 9
				}
			})
		}).timeout(120000)
	})
})
