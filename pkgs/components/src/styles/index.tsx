import React from "react"
import createMuiTheme, {
    ThemeOptions
} from "@material-ui/core/styles/createMuiTheme"
import { useTheme as useMuiTheme, ThemeProvider } from "@material-ui/styles"
export { makeStyles, ThemeProvider } from "@material-ui/styles"
import { CssBaseline } from "@material-ui/core"

export const defaultConfig: ThemeOptions = {
    palette: {
        primary: {
            main: "#2979ff"
        },
        secondary: {
            main: "#ffc400"
        }
    },
    typography: {
        fontFamily: "Ubuntu",
        button: {
            textTransform: "none"
        }
    },
    overrides: {
        MuiCssBaseline: {
            "@global": {
                ".MuiAccordion-root:before": {
                    height: "0 !important"
                }
            }
        }
    }
}

export const makeTheme = createMuiTheme
export const defaultTheme = createMuiTheme(defaultConfig)

export type DefaultThemeProps = {
    children: JSX.Element
}
export const DefaultTheme = ({ children }: DefaultThemeProps) => (
    <ThemeProvider theme={defaultTheme}>
        <CssBaseline />
        {children}
    </ThemeProvider>
)
export const T = DefaultTheme
export type Theme = typeof defaultTheme
export const useTheme = () => useMuiTheme<typeof defaultTheme>()
export const usePalette = () => useTheme().palette
