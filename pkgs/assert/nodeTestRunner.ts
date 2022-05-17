import chalk from "chalk"
// @ts-ignore
import { testDefinitions } from "@deno/shim-deno/test-internals"
// @ts-ignore
import process from "process"
// @ts-ignore
import { join } from "path"
// @ts-ignore
import { readdirSync, lstatSync, writeFileSync } from "fs"

// This is relative to the build "out" dir since it will be copied there
const testSrcOutputPath = "./src/tests"

type FilterFunction<T> = (value: T, index: number, context: T[]) => boolean

type WalkOptions = {
    excludeFiles?: boolean
    excludeDirs?: boolean
    exclude?: FilterFunction<string>
    include?: FilterFunction<string>
}

const walkPaths = (dir: string, options: WalkOptions = {}): string[] =>
    readdirSync(dir).reduce((paths, item, index, siblings) => {
        const path = join(dir, item)
        const isDir = lstatSync(path).isDirectory()
        const excludeCurrent =
            (options.excludeDirs && isDir) ||
            (options.excludeFiles && !isDir) ||
            (options.exclude && options.exclude(path, index, siblings)) ||
            (options.include && !options.include(path, index, siblings))
        const nestedPaths = isDir ? walkPaths(path, options) : []
        return [...paths, ...(excludeCurrent ? [] : [path]), ...nestedPaths]
    }, [] as string[])

const filePaths = walkPaths(testSrcOutputPath, {
    include: (path) => path.endsWith(".test.ts")
}).map((path) => "./" + path.replace(/\.ts$/, ".js"))

async function main() {
    const testContext = {
        process,
        chalk
    }
    writeFileSync(
        join(testSrcOutputPath, "tsconfig.json"),
        JSON.stringify({
            compilerOptions: {
                strict: true
            },
            include: ["."]
        })
    )
    process.chdir(testSrcOutputPath)
    for (const [i, filePath] of filePaths.entries()) {
        if (i > 0) {
            console.log("")
        }
        console.log("\nRunning tests in " + chalk.underline(filePath) + "...\n")
        await import(filePath)
        await runTestDefinitions(
            testDefinitions.splice(0, testDefinitions.length),
            testContext
        )
    }
}
// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.

export interface Chalk {
    green(text: string): string
    red(text: string): string
    gray(text: string): string
}

export interface NodeProcess {
    stdout: {
        write(text: string): void
    }
    exit(code: number): number
}

export interface RunTestDefinitionsOptions {
    chalk: Chalk
    process: NodeProcess
}

export interface TestDefinition {
    name: string | undefined
    fn: (context: TestContext) => Promise<void> | void
    ignore?: boolean
}

export interface TestContext {
    name: string | undefined
    err: any
    children: TestContext[]
    hasFailingChild: boolean
    getOutput(): string
    step(
        nameOrDefinition: string | TestDefinition,
        fn?: (context: TestContext) => void | Promise<void>
    ): Promise<boolean>
    status: "ok" | "fail" | "pending" | "ignored"
}

export async function runTestDefinitions(
    testDefinitions: TestDefinition[],
    options: RunTestDefinitionsOptions
) {
    const testFailures = []
    for (const definition of testDefinitions) {
        options.process.stdout.write("test " + definition.name + " ...")
        if (definition.ignore) {
            options.process.stdout.write(` ${options.chalk.gray("ignored")}\n`)
            continue
        }
        const context = getTestContext()
        let pass = false
        try {
            await definition.fn(context)
            if (context.hasFailingChild) {
                testFailures.push({
                    name: definition.name,
                    err: new Error("Had failing test step.")
                })
            } else {
                pass = true
            }
        } catch (err) {
            testFailures.push({ name: definition.name, err })
        }
        const testStepOutput = context.getOutput()
        if (testStepOutput.length > 0) {
            options.process.stdout.write(testStepOutput)
        } else {
            options.process.stdout.write(" ")
        }
        options.process.stdout.write(getStatusText(pass ? "ok" : "fail"))
        options.process.stdout.write("\n")
    }

    if (testFailures.length > 0) {
        options.process.stdout.write("\nFAILURES")
        for (const failure of testFailures) {
            options.process.stdout.write("\n\n")
            options.process.stdout.write(failure.name + "\n")
            options.process.stdout.write(
                indentText((failure.err?.stack ?? failure.err).toString(), 1)
            )
        }
        options.process.exit(1)
    }

    function getTestContext(): TestContext {
        return {
            name: undefined,
            /** @type {any} */
            err: undefined,
            status: "ok",
            children: [],
            get hasFailingChild() {
                return this.children.some(
                    (c) => c.status === "fail" || c.status === "pending"
                )
            },
            getOutput() {
                let output = ""
                if (this.name) {
                    output += "test " + this.name + " ..."
                }
                if (this.children.length > 0) {
                    output +=
                        "\n" +
                        this.children
                            .map((c) => indentText(c.getOutput(), 1))
                            .join("\n") +
                        "\n"
                } else if (!this.err) {
                    output += " "
                }
                if (this.name && this.err) {
                    output += "\n"
                }
                if (this.err) {
                    output += indentText(
                        (this.err.stack ?? this.err).toString(),
                        1
                    )
                    if (this.name) {
                        output += "\n"
                    }
                }
                if (this.name) {
                    output += getStatusText(this.status)
                }
                return output
            },
            async step(nameOrTestDefinition, fn) {
                const definition = getDefinition()

                const context = getTestContext()
                context.status = "pending"
                context.name = definition.name
                context.status = "pending"
                this.children.push(context)

                if (definition.ignore) {
                    context.status = "ignored"
                    return false
                }

                try {
                    await definition.fn(context)
                    context.status = "ok"
                    if (context.hasFailingChild) {
                        context.status = "fail"
                        return false
                    }
                    return true
                } catch (err) {
                    context.status = "fail"
                    context.err = err
                    return false
                }

                /** @returns {TestDefinition} */
                function getDefinition() {
                    if (typeof nameOrTestDefinition === "string") {
                        if (!(fn instanceof Function)) {
                            throw new TypeError(
                                "Expected function for second argument."
                            )
                        }
                        return {
                            name: nameOrTestDefinition,
                            fn
                        }
                    } else if (typeof nameOrTestDefinition === "object") {
                        return nameOrTestDefinition
                    } else {
                        throw new TypeError(
                            "Expected a test definition or name and function."
                        )
                    }
                }
            }
        }
    }

    function getStatusText(status: TestContext["status"]) {
        switch (status) {
            case "ok":
                return options.chalk.green(status)
            case "fail":
            case "pending":
                return options.chalk.red(status)
            case "ignored":
                return options.chalk.gray(status)
            default: {
                const _assertNever: never = status
                return status
            }
        }
    }

    function indentText(text: string, indentLevel: number) {
        if (text === undefined) {
            text = "[undefined]"
        } else if (text === null) {
            text = "[null]"
        } else {
            text = text.toString()
        }
        return text
            .split(/\r?\n/)
            .map((line) => "  ".repeat(indentLevel) + line)
            .join("\n")
    }
}

main()
