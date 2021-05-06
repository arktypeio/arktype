#!/usr/bin/env node
const execa = require("execa")
const { basename } = require("path")
const { writeFile } = require("fs/promises")

const cwd = process.cwd()
const pkg = basename(cwd)

const run = async (cmd, args) => {
    const execution = execa(cmd, args)
    execution.stdout.pipe(process.stdout)
    execution.stderr.pipe(process.stderr)
    return await execution
}

const build = async () => {
    try {
        console.log(`redo-build🔨: Building ${pkg}...`)
        // console.log(`redo-build🔨: Transpiling ${pkg}...`)
        // await run("babel", [
        //     "src",
        //     "-d",
        //     "dist",
        //     "--extensions",
        //     ".ts,.tsx",
        //     "--ignore",
        //     "src/**/__tests__/*",
        //     "--source-maps",
        //     "inline",
        //     "--delete-dir-on-start"
        // ])
        // console.log(`redo-build🔨: Compiling types for ${pkg}...`)
        // await run("tsc", ["--emitDeclarationOnly"])
        await run("tsc", [
            "--module",
            "esnext",
            "--outDir",
            "dist/mjs",
            "--target",
            "esnext"
        ])
        await writeFile("dist/mjs/package.json", `{"type": "module"}`)
        await run("tsc", [
            "--module",
            "commonjs",
            "--outDir",
            "dist/cjs",
            "--target",
            "es2015"
        ])
        await writeFile("dist/cjs/package.json", `{"type": "commonjs"}`)
        console.log(`redo-build🔨: Finished building ${pkg}.`)
    } catch (e) {
        console.log(
            "redo-build🔨:❗️Build failed due to the following error:❗️"
        )
        console.log(e)
        process.exit(1)
    }
}

build()
