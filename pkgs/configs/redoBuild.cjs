#!/usr/bin/env node

// Based on https://www.sensedeep.com/blog/posts/2021/how-to-create-single-source-npm-module.html
const { basename, join } = require("path")
const { existsSync, readFileSync, writeFileSync, rmSync } = require("fs")
const { walkPaths, shell } = require("@re-do/node-utils")

const cwd = process.cwd()
const pkg = basename(cwd)
const outDir = join(cwd, "dist")

const addTypeToPackageJson = (name) => {
    const packageJsonPath = join(outDir, name, "package.json")
    const existingContent = existsSync(packageJsonPath)
        ? JSON.parse(readFileSync(packageJsonPath).toString())
        : {}
    writeFileSync(
        packageJsonPath,
        JSON.stringify(
            {
                ...existingContent,
                type: name === "cjs" ? "commonjs" : "module"
            },
            null,
            4
        )
    )
}

const build = () => {
    try {
        console.log(`redo-build🔨: Building ${pkg}...`)
        shell("tsc", [
            "--module",
            "esnext",
            "--outDir",
            "dist/mjs",
            "--target",
            "esnext"
        ])
        addTypeToPackageJson("mjs")
        shell("tsc", [
            "--module",
            "commonjs",
            "--outDir",
            "dist/cjs",
            "--target",
            "es2015"
        ])
        addTypeToPackageJson("cjs")
        walkPaths(outDir)
            .filter(
                (path) =>
                    basename(path) === "__tests__" ||
                    basename(path).endsWith(".stories.tsx")
            )
            .forEach((path) => rmSync(path, { recursive: true, force: true }))
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
