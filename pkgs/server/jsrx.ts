import { jsrx, shell, $ } from "jsrx"
import { readFileSync, writeFileSync, copySync } from "fs-extra"
import { join } from "path"

const generate = () => {
    shell("prisma2 generate")
    shell("ts-node --transpile-only src/schema")
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
    shell(
        'prettier --write "{,!(node_modules|dist|release|.rush|.webpack)/**/*}*.{js,ts,json,yml,gql}"'
    )

const build = () => {
    generate()
    shell("tsc")
}

const upDb = () => {
    shell(
        `prisma2 migrate save --experimental --name ${process.env.NODE_ENV} --create-db`
    )
    shell("prisma2 migrate up --experimental")
    shell(`ts-node prisma/seed.ts`)
}

jsrx(
    {
        shared: {
            build,
            generate,
            tsc: $("tsc"),
            upDb
        },
        dev: {
            createDb: () => {
                shell("rm -rf prisma/dev.db")
                shell("rm -rf prisma/migrations/*-development")
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
                shell("sls offline", { env: { SLS_DEBUG: "*" } })
            },
            prettify
        },
        prod: {
            deploy: () => {
                build()
                shell("sls deploy")
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
