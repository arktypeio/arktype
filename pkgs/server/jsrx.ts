import { jsrx, run, $ } from "jsrx"
import { readFileSync, writeFileSync, copySync } from "fs-extra"
import { join } from "path"

const generate = () => {
    run("prisma2 generate")
    run("ts-node --transpile-only src/schema")
    prettify()
    copySync(
        join(__dirname, "schema.gql"),
        join(__dirname, "src", "playground", "schema.gql")
    )
    copySync(
        join(__dirname, "schema.gql"),
        join(__dirname, "..", "model", "schema.gql")
    )
}

const prettify = () =>
    run(
        'prettier --write "{,!(node_modules|dist|release|.rush|.webpack)/**/*}*.{js,ts,json,yml,gql}"'
    )

const build = () => {
    generate()
    run("tsc")
}

const upDb = () => {
    run(`prisma2 lift save --name ${process.env.NODE_ENV} --create-db`)
    run("prisma2 lift up")
    run(`ts-node prisma/seed.ts`)
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
            createDb: () => {
                run("rm -rf prisma/dev.db")
                run("rm -rf prisma/migrations/*-development")
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
                upDb()
            },
            start: () => {
                build()
                run("sls offline", { env: { SLS_DEBUG: "*" } })
            },
            prettify
        },
        prod: {
            deploy: () => {
                build()
                run("sls deploy")
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
