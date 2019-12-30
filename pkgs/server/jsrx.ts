import { jsrx, run, $ } from "jsrx"
import { readFileSync, writeFileSync } from "fs-extra"
import { join } from "path"

const generate = async () => {
    await run("prisma2 generate")
    await run("ts-node --transpile-only src/schema")
    await run("cp schema.gql ../model")
}

const build = async () => {
    await generate()
    await run("tsc")
}

const upDb = async () => {
    await run(`prisma2 lift save --name ${process.env.NODE_ENV} --create-db`)
    await run("prisma2 lift up")
}

jsrx(
    {
        shared: {
            build,
            generate,
            studio: $("prisma2 dev"),
            tsc: $("tsc"),
            upDb
        },
        dev: {
            createDb: async () => {
                await run("rm -rf prisma/dev.db")
                await run("rm -rf prisma/migrations/*-development")
                const liftLockFile = join(
                    __dirname,
                    "prisma",
                    "migrations",
                    "lift.lock"
                )
                writeFileSync(
                    liftLockFile,
                    readFileSync(liftLockFile)
                        .toString()
                        .split("\n")
                        .filter(line => !line.endsWith("-development"))
                        .join("\n")
                )
                await upDb()
            },
            start: $("sls offline")
        },
        prod: {
            deploy: async () => {
                await build()
                await run("sls deploy")
            },
            pack: $("sls package")
        }
    },
    {
        excludeOthers: true,
        envFiles: {
            dev: join(__dirname, ".env"),
            prod: join(__dirname, ".env.production")
        }
    }
)
