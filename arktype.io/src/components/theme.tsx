import { createTheme } from "@mui/material"

export type ThemeConfigOptions = {
    isDark: boolean
}

export const getTheme = () =>
    createTheme({
        palette: {
            primary: {
                main: "#0067a5"
            },
            secondary: {
                main: "#e3ab57"
            },
            common: {
                white: "#fffff0"
            }
        },
        typography: {
            fontFamily: "'Raleway', sans-serif"
        }
    })
