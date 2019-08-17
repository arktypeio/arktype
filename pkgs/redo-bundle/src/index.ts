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

export const env = process.env.NODE_ENV as any
export const isDev = () => env === "development"

const makeCommonConfig = (): Configuration => ({
    mode: env,
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
})

const makeWebConfig = (): Configuration =>
    merge.smart(makeCommonConfig(), {
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

const makeInjectableWebConfig = (): Configuration =>
    merge.smart(makeWebConfig(), {
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

const makeRendererConfig = (): Configuration =>
    merge.smart(makeInjectableWebConfig(), {
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

const baseDevServerConfig: Configuration = {}

export const toggleDevServerConfig = (): Configuration => ({
    resolve: {
        alias: {
            "react-dom": require("@hot-loader/react-dom")
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
})
