import { jsrx, run, $ } from "jsrx"

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
    await run("prisma2 lift save --name $NODE_ENV --create-db")
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
                await upDb()
                await run("rm -rf prisma/migrations/*-development")
                await run(
                    "sed -i '/-development/d' prisma/migrations/lift.lock"
                )
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
    { excludeOthers: true }
)
