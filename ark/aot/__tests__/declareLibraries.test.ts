import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { emitDeclarations } from "@ark/aot/internal/declare.ts"
import { precompile } from "@ark/aot/unplugin"
import { spawnSync } from "node:child_process"
import { readdirSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { relative } from "node:path/posix"
import {
	build as viteBuild,
	defaultClientConditions,
	type Rolldown
} from "vite"
import { inexactExportsOf, runCli, tsPath } from "./utils.ts"

const libraries = fromHere("declaredLibraries")
const out = join(libraries, "out")

// what TypeScript 6's own `tsc --emitDeclarationOnly` declares each module as
const ownDeclarations = (...args: string[]): Record<string, string> => {
	try {
		spawnSync(
			process.execPath,
			[
				fromHere("..", "node_modules", "typescript-6", "bin", "tsc"),
				"--declaration",
				"--emitDeclarationOnly",
				...args
			],
			{ cwd: libraries, encoding: "utf8" }
		)
		return Object.fromEntries(
			readdirSync(out).map(file => [
				file,
				readFileSync(join(out, file), "utf8")
			])
		)
	} finally {
		rmSync(out, { recursive: true, force: true })
	}
}

contextualize(() => {
	const { files, errors, diagnostics } = emitDeclarations({ cwd: libraries })
	const declaredFile = (file: string) => files[tsPath(join(out, file))]
	const declarationsOf = (file: string, ...names: string[]) =>
		declaredFile(file)
			.split(/\n(?=export |declare )/)
			.filter(declaration =>
				names.includes(declaration.split(/[ (:<]/)[3] ?? "")
			)
			.join("\n")
			.trimEnd()
	const shapesOf = (...names: string[]) =>
		declaredFile("~arktype.d.ts")
			.split(/\n(?=export type )/)
			.filter(shape => names.includes(shape.split(" ")[2]))
			.join("\n")
	const own = ownDeclarations()

	it("TypeScript writes a Type's shape again where tRPC's router holds its input", () => {
		attest(own["trpc.d.ts"])
			.snap(`export declare const User: import("arktype/internal/variants/object.ts").ObjectType<{
    name: string;
    age: number;
}, {}>;
export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: object;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    createUser: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            age: number;
        };
        output: {
            message: string;
        };
        meta: object;
    }>;
}>>;
export type AppRouter = typeof appRouter;
`)
	})

	it("declares tRPC's router by the shape's name", () => {
		attest([errors, diagnostics]).equals([0, ""])
		attest(declaredFile("trpc.d.ts"))
			.snap(`export declare const User: import("arktype").Type<import("./~arktype.js").User>;
export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: object;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    createUser: import("@trpc/server").TRPCMutationProcedure<{
        input: import("./~arktype.js").User;
        output: {
            message: string;
        };
        meta: object;
    }>;
}>>;
export type AppRouter = typeof appRouter;
`)
		attest(shapesOf("User")).snap(`export type User = {
    name: string;
    age: number;
};`)
	})

	it("names a morph's input, an output's array and a cyclic alias in tRPC's procedures", () => {
		attest(declaredFile("trpcRouter.d.ts"))
			.snap(`export declare const router: import("@trpc/server").TRPCBuiltRouter<{
    ctx: object;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    signup: import("@trpc/server").TRPCMutationProcedure<{
        input: import("./~arktype.js").SignupIn;
        output: import("./~arktype.js").Account;
        meta: object;
    }>;
    accounts: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: import("./~arktype.js").Account[];
        meta: object;
    }>;
    reply: import("@trpc/server").TRPCMutationProcedure<{
        input: import("./~arktype.js").comment;
        output: import("./~arktype.js").comment;
        meta: object;
    }>;
}>>;
`)
	})

	// Signup's input and output are neither its shape nor each other
	it("names a Type's input and output once a declaration holds one", () => {
		attest(shapesOf("Signup", "SignupIn", "SignupOut"))
			.snap(`export type Signup = {
    email: string;
    age: Port;
    role: import("arktype").Default<Role, "member">;
    referrer?: Account | undefined;
};
export type SignupIn = {
    email: string;
    age: string;
    referrer?: Account | undefined;
    role?: "admin" | "member" | undefined;
};
export type SignupOut = {
    email: string;
    age: number;
    role: Role;
    referrer?: Account | undefined;
};`)
	})

	it("declares a default export's router", () => {
		attest(declaredFile("default.d.ts"))
			.snap(`declare const _default: import("@trpc/server").TRPCBuiltRouter<{
    ctx: object;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    signup: import("@trpc/server").TRPCMutationProcedure<{
        input: import("./~arktype.js").SignupIn;
        output: "admin" | "member";
        meta: object;
    }>;
}>>;
export default _default;
`)
	})

	// the output of `c.json` is a type Hono maps from the handler's, so it
	// isn't the Type's shape
	it("names each validated input of Hono's routes", () => {
		attest(declaredFile("hono.d.ts"))
			.snap(`export declare const app: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
    "/signup": {
        $post: {
            input: {
                json: import("./~arktype.js").SignupIn;
            };
            output: {
                readonly success: false;
                readonly error: readonly import("@standard-schema/spec").StandardSchemaV1.Issue[];
                readonly data: any;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {
                json: import("./~arktype.js").SignupIn;
            };
            output: {
                role: "admin" | "member";
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/accounts": {
        $put: {
            input: {
                json: import("./~arktype.js").Account;
            };
            output: {
                readonly success: false;
                readonly error: readonly import("@standard-schema/spec").StandardSchemaV1.Issue[];
                readonly data: any;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {
                json: import("./~arktype.js").Account;
            };
            output: {
                id: string;
                email: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/comments": {
        $post: {
            input: {
                json: import("./~arktype.js").comment;
            };
            output: {
                readonly success: false;
                readonly error: readonly import("@standard-schema/spec").StandardSchemaV1.Issue[];
                readonly data: any;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {
                json: import("./~arktype.js").comment;
            };
            output: "ok";
            outputFormat: "text";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/", "/comments">;
export type App = typeof app;
`)
	})

	it("declares oRPC's procedures through the Types they hold", () => {
		attest(declaredFile("orpc.d.ts"))
			.snap(`export declare const signup: import("@orpc/server").DecoratedProcedure<Record<never, never>, Record<never, never>, import("arktype").Type<import("./~arktype.js").Signup>, import("arktype").Type<import("./~arktype.js").Account>, Record<never, never>, Record<never, never>>;
export declare const orpcRouter: {
    signup: import("@orpc/server").DecoratedProcedure<Record<never, never>, Record<never, never>, import("arktype").Type<import("./~arktype.js").Signup>, import("arktype").Type<import("./~arktype.js").Account>, Record<never, never>, Record<never, never>>;
    reply: import("@orpc/server").DecoratedProcedure<Record<never, never>, Record<never, never>, import("arktype").Type<import("./~arktype.js").comment, import("./~arktype.js").types>, import("@orpc/server").Schema<import("./~arktype.js").comment, import("./~arktype.js").comment>, Record<never, never>, Record<never, never>>;
};
`)
	})

	// a form's values are its defaults' type, which the first's isn't a Type's
	it("declares TanStack Form's validator, and its values where they're a Type's", () => {
		attest(declaredFile("tanstackForm.d.ts"))
			.snap(`import { FormApi } from "@tanstack/form-core";
export declare const accountForm: FormApi<{
    id: string;
    email: string;
}, import("@tanstack/form-core").FormValidateOrFn<{
    id: string;
    email: string;
}> | undefined, import("arktype").Type<import("./~arktype.js").Account>, import("@tanstack/form-core").FormAsyncValidateOrFn<{
    id: string;
    email: string;
}> | undefined, import("@tanstack/form-core").FormValidateOrFn<{
    id: string;
    email: string;
}> | undefined, import("@tanstack/form-core").FormAsyncValidateOrFn<{
    id: string;
    email: string;
}> | undefined, import("@tanstack/form-core").FormValidateOrFn<{
    id: string;
    email: string;
}> | undefined, import("@tanstack/form-core").FormAsyncValidateOrFn<{
    id: string;
    email: string;
}> | undefined, import("@tanstack/form-core").FormValidateOrFn<{
    id: string;
    email: string;
}> | undefined, import("@tanstack/form-core").FormAsyncValidateOrFn<{
    id: string;
    email: string;
}> | undefined, import("@tanstack/form-core").FormAsyncValidateOrFn<{
    id: string;
    email: string;
}> | undefined, never>;
export declare const signupForm: FormApi<import("./~arktype.js").SignupIn, import("@tanstack/form-core").FormValidateOrFn<import("./~arktype.js").SignupIn> | undefined, import("@tanstack/form-core").FormValidateOrFn<import("./~arktype.js").SignupIn> | undefined, import("@tanstack/form-core").FormAsyncValidateOrFn<import("./~arktype.js").SignupIn> | undefined, import("@tanstack/form-core").FormValidateOrFn<import("./~arktype.js").SignupIn> | undefined, import("@tanstack/form-core").FormAsyncValidateOrFn<import("./~arktype.js").SignupIn> | undefined, import("arktype").Type<import("./~arktype.js").Signup>, import("@tanstack/form-core").FormAsyncValidateOrFn<import("./~arktype.js").SignupIn> | undefined, import("@tanstack/form-core").FormValidateOrFn<import("./~arktype.js").SignupIn> | undefined, import("@tanstack/form-core").FormAsyncValidateOrFn<import("./~arktype.js").SignupIn> | undefined, import("@tanstack/form-core").FormAsyncValidateOrFn<import("./~arktype.js").SignupIn> | undefined, never>;
`)
	})

	it("declares the Type TanStack Router validates a route's search with", () => {
		attest(declaredFile("tanstackRouter.d.ts"))
			.snap(`export declare const Search: import("arktype").Type<import("./~arktype.js").Search>;
export declare const accountsRoute: import("@tanstack/react-router").Route<unknown, import("@tanstack/react-router").RootRoute<import("@tanstack/router-core").Register, undefined, {}, import("@tanstack/router-core").AnyContext, import("@tanstack/router-core").AnyContext, {}, undefined, unknown, unknown, unknown, unknown, undefined>, "/accounts", "/accounts", string, "/accounts", import("arktype").Type<import("./~arktype.js").Search>, import("@tanstack/router-core").ResolveParams<"/accounts">, import("@tanstack/router-core").AnyContext, import("@tanstack/router-core").AnyContext, import("@tanstack/router-core").AnyContext, {}, undefined, unknown, unknown, unknown, unknown, undefined>;
export declare const accountRoute: import("@tanstack/react-router").Route<unknown, import("@tanstack/react-router").RootRoute<import("@tanstack/router-core").Register, undefined, {}, import("@tanstack/router-core").AnyContext, import("@tanstack/router-core").AnyContext, {}, undefined, unknown, unknown, unknown, unknown, undefined>, "/account", "/account", string, "/account", import("arktype").Type<import("./~arktype.js").Account>, import("@tanstack/router-core").ResolveParams<"/account">, import("@tanstack/router-core").AnyContext, import("@tanstack/router-core").AnyContext, import("@tanstack/router-core").AnyContext, {}, undefined, unknown, unknown, unknown, unknown, undefined>;
`)
	})

	it("names a react-hook-form resolver's input and output", () => {
		attest(declaredFile("hookForm.d.ts"))
			.snap(`export declare const accountResolver: import("react-hook-form").Resolver<import("./~arktype.js").Account, unknown, import("./~arktype.js").Account>;
export declare const signupResolver: import("react-hook-form").Resolver<import("./~arktype.js").SignupIn, unknown, import("./~arktype.js").SignupOut>;
export declare const signupForm: {
    mode: "onBlur";
    resolver: import("react-hook-form").Resolver<import("./~arktype.js").SignupIn, unknown, import("./~arktype.js").SignupOut>;
};
`)
	})

	// env-core's result holds each variable's output, none of which is a shape
	it("leaves @t3-oss/env-core's env, which holds no shape", () => {
		attest(declaredFile("env.d.ts"))
			.snap(`export declare const Port: import("arktype").Type<import("./~arktype.js").Port>;
export declare const env: Readonly<{
    PORT: number;
    DATABASE_URL: string;
}>;
`)
	})

	it("declares drizzle-arktype's Types and a function of their data", () => {
		attest(declarationsOf("drizzle.d.ts", "SelectUser", "InsertUser", "insert"))
			.snap(`export declare const SelectUser: import("arktype").Type<import("./~arktype.js").SelectUser>;
export declare const InsertUser: import("arktype").Type<import("./~arktype.js").InsertUser>;
export declare const insert: (user: typeof InsertUser.infer) => import("./~arktype.js").InsertUser;`)
		attest(shapesOf("SelectUser", "InsertUser"))
			.snap(`export type SelectUser = {
    name: string;
    bio: string | null;
};
export type InsertUser = {
    name: string;
    bio?: string | undefined | null;
};`)
	})

	it("keeps Standard Schema's InferInput and InferOutput as written, naming what's inferred", () => {
		attest(declaredFile("standard.d.ts"))
			.snap(`import type { StandardSchemaV1 } from "@standard-schema/spec";
import { Account, Signup, types } from "./schemas.ts";
export type SignupInput = StandardSchemaV1.InferInput<typeof Signup>;
export type SignupOutput = StandardSchemaV1.InferOutput<typeof Signup>;
export declare const signUp: (data: StandardSchemaV1.InferInput<typeof Signup>) => import("./~arktype.js").SignupOut;
export declare function readAccount(data: unknown): import("./~arktype.js").Account;
export declare const reply: (comment: typeof types.comment.infer) => import("./~arktype.js").comment;
export declare const accountsById: (accounts: (typeof Account.infer)[]) => {
    [k: string]: import("./~arktype.js").Account;
};
export declare const lastSignup: {
    at: number;
    data: import("./~arktype.js").SignupOut;
};
`)
	})

	it("names a shape in a class, a function, a tuple, a readonly array and an intersection", () => {
		attest(
			declarationsOf(
				"plain.d.ts",
				"loaded",
				"stored",
				"handler",
				"tupled",
				"frozen",
				"merged",
				"validated"
			)
		)
			.snap(`export declare const loaded: Loaded<import("./~arktype.js").Account, never>;
export declare const stored: Store<import("./~arktype.js").SignupOut>;
export declare const handler: (input: import("./~arktype.js").SignupIn, ...fallbacks: import("./~arktype.js").SignupOut[]) => Promise<import("./~arktype.js").SignupOut>;
export declare const tupled: [import("./~arktype.js").Account, (import("./~arktype.js").SignupIn | undefined)?, ...import("./~arktype.js").Account[]];
export declare const frozen: readonly import("./~arktype.js").Account[];
export declare const merged: import("./~arktype.js").Account & {
    token: string;
};
export declare const validated: import("@ark/schema").StandardSchemaV1.Result<import("./~arktype.js").Account> | Promise<import("@ark/schema").StandardSchemaV1.Result<import("./~arktype.js").Account>>;`)
	})

	it("tells a union's members apart by a key's type, leaving those it can't", () => {
		attest(declarationsOf("plain.d.ts", "told", "untold"))
			.snap(`export declare const told: import("./~arktype.js").Account | import("./~arktype.js").Numbered;
export declare const untold: {
    id: string;
    email: string;
} | {
    id: string;
    email: string;
};`)
	})

	it("tells references to one interface apart by their arguments, and index signatures by their keys", () => {
		attest(declarationsOf("plain.d.ts", "loadedEither", "keyed"))
			.snap(`export declare const loadedEither: Loaded<import("./~arktype.js").Account, never> | Loaded<import("./~arktype.js").SignupOut, never>;
export declare const keyed: {
    [id: number]: import("./~arktype.js").SignupOut;
    [name: string]: import("./~arktype.js").SignupOut | null;
};`)
	})

	it("leaves a literal union, a global and a Type no const holds", () => {
		attest(declarationsOf("plain.d.ts", "interned", "inline"))
			.snap(`export declare const interned: {
    role: Loaded<"admin" | "member", never>;
    created: Loaded<Date, never>;
};
export declare const inline: Loaded<{
    inline: string;
}, never>;`)
	})

	it("names a scope's alias a declaration holds, a destructured name and a function's return", () => {
		attest(declarationsOf("plain.d.ts", "thread", "data", "loadComment"))
			.snap(`export declare const thread: Loaded<import("./~arktype.js").thread, never>;
export declare const data: import("./~arktype.js").SignupOut, error: undefined;
export declare function loadComment(): Loaded<import("./~arktype.js").comment, never>;`)
		attest(shapesOf("types", "thread")).snap(`export type types = {
    comment: comment;
    thread: thread;
};
export type thread = {
    title: string;
    comments: comment[];
};`)
	})

	it("names what a generic function returns beside its type parameter", () => {
		attest(declarationsOf("plain.d.ts", "tagged", "taggedBy"))
			.snap(`export declare function tagged<tag>(tag: tag): {
    tag: tag;
    account: import("./~arktype.js").Account;
    schema: import("arktype").Type<import("./~arktype.js").Account>;
};
export declare const taggedBy: <tag>(tag: tag) => {
    tag: tag;
    signup: import("./~arktype.js").SignupOut;
};`)
	})

	it("names a cyclic alias's input and output", () => {
		attest(declarationsOf("plain.d.ts", "parsed")).snap(
			'export declare const parsed: (input: import("./~arktype.js").nodeIn, ...fallbacks: import("./~arktype.js").nodeOut[]) => Promise<import("./~arktype.js").nodeOut>;'
		)
		attest(shapesOf("node", "nodeIn", "nodeOut")).snap(`export type node = {
    value: Port;
    next?: node | undefined;
};
export type nodeIn = {
    value: string;
    next?: nodeIn | undefined;
};
export type nodeOut = {
    value: number;
    next?: nodeOut | undefined;
};
`)
	})

	// how many times each module's declaration writes out the `email` key
	// Account, Signup and its input and output each hold
	it("writes a shape once where TypeScript writes it wherever it's held", () => {
		const written = (declaration: string) =>
			declaration.split(/^\s+email: string;$/m).length - 1
		attest(
			Object.fromEntries(
				Object.keys(own)
					.filter(file => written(own[file]))
					.map(file => [
						file,
						{ tsc: written(own[file]), declare: written(declaredFile(file)) }
					])
			)
		).snap({
			"default.d.ts": { tsc: 2, declare: 0 },
			"hono.d.ts": { tsc: 7, declare: 1 },
			"hookForm.d.ts": { tsc: 10, declare: 0 },
			"orpc.d.ts": { tsc: 6, declare: 0 },
			"plain.d.ts": { tsc: 36, declare: 2 },
			"schemas.d.ts": { tsc: 3, declare: 0 },
			"standard.d.ts": { tsc: 6, declare: 0 },
			"tanstackForm.d.ts": { tsc: 33, declare: 10 },
			"tanstackRouter.d.ts": { tsc: 1, declare: 0 },
			"trpcRouter.d.ts": { tsc: 4, declare: 0 }
		})
		attest(written(declaredFile("~arktype.d.ts"))).snap(6)
	})

	it("CLI declarations read as their sources", () => {
		attest(
			inexactExportsOf(libraries, {
				"default.default":
					"eq<typeof defaultDeclared.default, typeof defaultSource.default>",
				"standard.SignupInput":
					"eq<standardDeclared.SignupInput, standardSource.SignupInput>",
				"standard.SignupOutput":
					"eq<standardDeclared.SignupOutput, standardSource.SignupOutput>",
				"hono.App": "eq<honoDeclared.App, honoSource.App>",
				"trpc.AppRouter": "eq<trpcDeclared.AppRouter, trpcSource.AppRouter>"
			})
		).snap([])
	}).timeout(300000)

	it("vite declares the same modules with declare: true", async () => {
		const conditions = ["ark-ts"]
		const [{ output }] = (await viteBuild({
			root: libraries,
			configFile: false,
			logLevel: "silent",
			plugins: [precompile.vite({ cwd: libraries, declare: true, conditions })],
			resolve: { conditions: [...conditions, ...defaultClientConditions] },
			build: {
				write: false,
				lib: { entry: "src/trpc.ts", formats: ["es"] }
			}
		})) as Rolldown.RolldownOutput[]
		attest(
			Object.fromEntries(
				output.flatMap(file =>
					file.type === "asset" ? [[file.fileName, file.source]] : []
				)
			)
		).equals(
			Object.fromEntries(
				Object.entries(files).map(([path, text]) => [
					relative(tsPath(out), path),
					text
				])
			)
		)
	}).timeout(120000)

	it("declares over what tsc wrote for a tsconfig with declaration: true", () => {
		try {
			spawnSync(
				process.execPath,
				[
					fromHere("..", "node_modules", "typescript-6", "bin", "tsc"),
					"-p",
					"tsconfig.declaration.json"
				],
				{ cwd: libraries }
			)
			const cli = runCli(
				libraries,
				"--declare",
				"--tsconfig",
				"tsconfig.declaration.json"
			)
			attest(cli.status).equals(0)
			attest(readFileSync(join(out, "trpc.d.ts"), "utf8")).equals(
				declaredFile("trpc.d.ts")
			)
			// tsc wrote each module's JavaScript, which --declare leaves
			attest(readdirSync(out).filter(file => file.startsWith("trpc."))).snap([
				"trpc.d.ts",
				"trpc.js"
			])
		} finally {
			rmSync(out, { recursive: true, force: true })
		}
	}).timeout(120000)

	// TypeScript writes no declaration for a module it reports
	it("reports each export isolatedDeclarations wants annotated, declaring none", () => {
		const isolated = emitDeclarations({
			cwd: libraries,
			tsconfig: "tsconfig.isolated.json"
		})
		attest(isolated.diagnostics)
			.snap(`src/trpc.ts(4,14): error TS9010: Variable must have an explicit type annotation with --isolatedDeclarations.
src/trpc.ts(8,14): error TS9010: Variable must have an explicit type annotation with --isolatedDeclarations.
`)
		attest(
			Object.keys(isolated.files).map(path => relative(tsPath(out), path))
		).snap(["~arktype.d.ts"])
	}).timeout(60000)
})
