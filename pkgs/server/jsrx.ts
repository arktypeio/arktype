import { jsrx, run, $ } from "jsrx"

jsrx(
    {
        shared: {
            build: $("npm run generate && npm run tsc"),
            generate: $(
                "prisma2 generate && ts-node --transpile-only src/schema && cp schema.gql ../model"
            ),
            studio: $("prisma2 dev"),
            tsc: $("tsc"),
            upDb: $(
                "prisma2 lift save --name $NODE_ENV --create-db && prisma2 lift up"
            )
        },
        dev: {
            createDb: () => {
                run("rm -rf prisma/dev.db && npm run _wipeMigrationsDev")
                run("npm run upDb")
                run(
                    "rm -rf prisma/migrations/*-development && sed -i '/-development/d' prisma/migrations/lift.lock"
                )
            },
            start: $("sls offline")
        },
        prod: {
            deploy: $("npm run build-prod && sls deploy"),
            pack: $("sls package")
        }
    },
    { excludeOthers: true }
)
