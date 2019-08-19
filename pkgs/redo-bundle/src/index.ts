import { resolve } from "path"
import HtmlWebpackPlugin from "html-webpack-plugin"
import { TsconfigPathsPlugin } from "tsconfig-paths-webpack-plugin"
import merge from "webpack-merge"
import {
    Configuration,
    IgnorePlugin,
    NamedModulesPlugin,
    HotModuleReplacementPlugin,
    NoEmitOnErrorsPlugin
} from "webpack"
import { ValueFrom } from "redo-utils"

export const env = process.env.NODE_ENV as any
export const isDev = () => env === "development"
export type BaseName = keyof typeof baseOptions

export type BaseConfigOptions = {
    base: BaseName
    entry: ValueFrom<Configuration, "entry">
    devServer?: boolean
}

export const makeConfig = (
    { base, entry, devServer }: BaseConfigOptions,
    merged: Partial<Configuration>[] = []
) =>
    merge.smart(
        baseOptions[base],
        { entry },
        devServer ? devServerOptions : {},
        ...merged
    )

const commonOptions: Configuration = {
    mode: env,
    context: __dirname,
    devtool: isDev() ? "inline-source-map" : "source-map",
    node: {
        __dirname: false,
        __filename: false
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
        plugins: [new TsconfigPathsPlugin()],
        alias: {
            ws: "isomorphic-ws"
        }
    },
    module: {
        rules: [
            {
                test: /\.(j|t)sx?$/,
                loader: "babel-loader",
                exclude: /node_modules/
            },
            {
                type: "javascript/auto",
                test: /\.mjs$/,
                use: []
            }
        ]
    }
}

const webOptions: Configuration = merge.smart(commonOptions, {
    module: {
        rules: [
            {
                test: /\.(jpg|png|ico|icns|woff|woff2)$/,
                loader: "file-loader"
            },
            {
                test: /\.svg$/,
                use: [
                    {
                        loader: "babel-loader"
                    },
                    {
                        loader: "react-svg-loader",
                        options: {
                            jsx: true
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                loaders: ["style-loader", "css-loader"]
            },
            {
                test: /node_modules[\/\\](iconv-lite)[\/\\].+/,
                resolve: {
                    aliasFields: ["main"]
                }
            }
        ]
    },
    plugins: [
        new IgnorePlugin(/\/iconv-loader$/),
        new HtmlWebpackPlugin({
            template: resolve(__dirname, "template.html")
        })
    ]
})

const injectableOptions: Configuration = merge.smart(webOptions, {
    module: {
        rules: [
            {
                test: /\.(j|t)sx?$/,
                loader: "ts-loader",
                exclude: /node_modules/
            }
        ]
    }
})

const rendererOptions: Configuration = merge.smart(webOptions, {
    target: "electron-renderer",
    resolve: {
        /*
    Override default value ["browser"] since we have enabled node integration
    And have access to more than we would in a basic web environment.
    In particular, this allows us to import puppeteer, which specifies a 
    "browser" field in its package.json that breaks our ability to import it.
    */
        aliasFields: []
    }
})

const devServerOptions = {
    resolve: {
        alias: {
            "react-dom": "@hot-loader/react-dom"
        }
    },
    entry: [
        "react-hot-loader/patch",
        "webpack-dev-server/client?http://localhost:8080",
        "webpack/hot/only-dev-server"
    ],
    plugins: [
        new NamedModulesPlugin(),
        new HotModuleReplacementPlugin(),
        new NoEmitOnErrorsPlugin()
    ],
    devServer: {
        historyApiFallback: true,
        hot: true,
        writeToDisk: true
    }
} as Configuration

const baseOptions = {
    common: commonOptions,
    web: webOptions,
    injectable: injectableOptions,
    renderer: rendererOptions
}
