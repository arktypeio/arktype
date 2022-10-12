import { createTheme } from "@mui/material"

export type ThemeConfigOptions = {
    isDark: boolean
}

export const getTheme = ({ isDark }: ThemeConfigOptions) =>
    createTheme({
        palette: {
            primary: {
                main: isDark ? "#264bcf" : "#162b79"
            },
            secondary: {
                main: "#ffc40c"
            },
            error: {
                main: "#c80815"
            },
            success: {
                main: "#00ad43"
            },
            warning: {
                main: "#ff7518"
            },
            common: {
                white: "#fffff0"
            },
            info: {
                main: "#264bcf"
            },
            background: {
                default: isDark ? "#242424" : "#fffff0"
            }
        },
        typography: {
            fontFamily: "'Raleway', sans-serif"
        }
    })
