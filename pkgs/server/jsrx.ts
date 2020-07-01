import { jsrx, shell, $ } from "jsrx"
import { copySync } from "fs-extra"
import { join } from "path"

const generate = () => {
    shell("prisma generate")
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
        'prettier --write "{,!(node_modules|dist|release|.rush|.webpack|.db)/**/*}*.{js,ts,json,yml,gql}"'
    )

const build = () => {
    generate()
    shell("tsc")
}

const upDb = () => {
    shell(`prisma migrate save --name ${process.env.NODE_ENV} --experimental`)
    shell("prisma migrate up --experimental")
}

const serve = $("sls offline", { env: { SLS_DEBUG: "*" } })

jsrx(
    {
        shared: {
            build,
            generate,
            tsc: $("tsc"),
            upDb
        },
        dev: {
            dev: () => {
                shell("nexus dev")
            },
            createDb: $("docker-compose up -d"),
            seed: $("ts-node prisma/seed.ts"),
            start: () => {
                build()
                serve()
            },
            serve,
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
