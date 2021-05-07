import { jsrx, $, shell } from "jsrx"

jsrx({
    dev: {
        "buildEnvTypes": $(`ts-node -O '{"module":"commonjs"}' scripts/buildEnvTypes.ts`),
        "build": $(`ts-node -O '{"module":"commonjs"}' scripts/build.ts`),
        "precompile": $(`cross-env MODE=production npm run build`),
        "compile": $(`electron-builder build --config electron-builder.config.js --dir --config.asar=false`),
        "pretest": $(`cross-env MODE=test npm run build`),
        "test": $(`node tests/app.spec.js`),
        "watch": $(`ts-node -O '{"module":"commonjs"}' scripts/watch.ts`),
        "lint": $(`eslint . --ext js,ts,vue`),
        "pretypecheck": $(`npm run buildEnvTypes`),
        "typecheck-main": $(`tsc --noEmit -p packages/main/tsconfig.json`),
        "typecheck-renderer": $(`tsc --noEmit -p packages/renderer/tsconfig.json`),
        "typecheck": $(`npm run typecheck-main && npm run typecheck-preload && npm run typecheck-renderer`)
    },
    prod: {},
    shared: {}
})
