import { jsrx } from "jsrx"
jsrx({
    shared: {
        build: ["generate", "tsc"],
        generate:
            "prisma2 generate && ts-node --transpile-only src/schema && cp schema.gql ../model",
        studio: "prisma2 dev",
        tsc: "tsc",
        upDb:
            "prisma2 lift save --name $NODE_ENV --create-db && prisma2 lift up"
    },
    dev: {
        createDb: ["wipeDb", "upDb", "wipeMigrations"],
        wipeDb: "rm -rf prisma/dev.db && npm run _wipeMigrationsDev",
        wipeMigrations:
            "rm -rf prisma/migrations/*-development && sed -i '/-development/d' prisma/migrations/lift.lock",
        start: "NODE_ENV=development && sls offline"
    },
    prod: {
        deploy: ["build", "slsDeploy"],
        slsDeploy: "sls deploy",
        package: "sls package"
    }
})
