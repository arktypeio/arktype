import { createTheme, responsiveFontSizes } from "@mui/material"

export type ThemeConfigOptions = {
    isDark: boolean
}

export const getTheme = () =>
    responsiveFontSizes(
        createTheme({
            palette: {
                primary: {
                    main: "#085b92",
                    light: "#80cff8"
                },
                secondary: {
                    main: "#eb9f2e",
                    dark: "#4b3621",
                    light: "#f5cf8f"
                },
                common: {
                    white: "#fffff0",
                    black: "#0d1117"
                }
            },
            typography: {
                fontFamily: "'Raleway', sans-serif"
            }
        })
    )
