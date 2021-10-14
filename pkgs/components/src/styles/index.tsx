import React from "react"
import {
    useTheme as useMuiTheme,
    createTheme as createMuiTheme,
    ThemeOptions,
    responsiveFontSizes,
    ThemeProvider
} from "@material-ui/core"

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
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                "@global": {
                    ".MuiAccordion-root:before": {
                        height: "0 !important"
                    }
                }
            }
        }
    }
}

export const makeTheme = createMuiTheme
export const defaultTheme = responsiveFontSizes(createMuiTheme(defaultConfig))

export type DefaultThemeProps = {
    children: JSX.Element
}
export const DefaultTheme = ({ children }: DefaultThemeProps) => (
    <ThemeProvider theme={defaultTheme}>{children}</ThemeProvider>
)
export const T = DefaultTheme
export type Theme = typeof defaultTheme
export const useTheme = () => useMuiTheme<typeof defaultTheme>()
export const usePalette = () => useTheme().palette
