const { declare } = require("@babel/helper-plugin-utils")

const presets = [
    [
        require("@babel/preset-env"),
        {
            targets: {
                node: "current"
            },
            useBuiltIns: "usage",
            corejs: 3
        }
    ],
    require("@babel/preset-typescript"),
    require("@babel/preset-react")
]

const plugins = [
    [
        require("@babel/plugin-transform-runtime"),
        {
            corejs: 3
        }
    ],
    [
        require("@babel/plugin-proposal-decorators"),
        {
            legacy: true
        }
    ],
    [
        require("@babel/plugin-proposal-class-properties"),
        {
            loose: true
        }
    ],
    require("@babel/plugin-proposal-object-rest-spread"),
    require("babel-plugin-transform-typescript-metadata")
]

module.exports = declare((api, opts) => {
    return { plugins, presets }
})
