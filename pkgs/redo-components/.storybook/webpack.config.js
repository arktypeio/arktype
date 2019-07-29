module.exports = ({ config }) => {
    config.module.rules.push({
        test: /\.tsx?$/,
        use: [
            {
                loader: require.resolve("babel-loader"),
                options: {
                    presets: [require.resolve("redo-bundle/babel.js")]
                }
            },
            require.resolve("react-docgen-typescript-loader")
        ]
    })

    config.resolve.extensions.push(".ts", ".tsx")

    return config
}
