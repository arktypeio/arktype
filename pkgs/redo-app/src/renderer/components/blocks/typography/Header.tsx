import React from "react"
import { Typography, Theme } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"
import { TypographyProps } from "@material-ui/core/Typography"
import { component } from "blocks"

const styles = (theme: Theme) =>
    createStyles({
        header: {
            color: theme.palette.secondary.main
        }
    })

export type HeaderProps = {
    variant?: TypographyProps["variant"]
    children: string
}

export const Header = component({
    name: "Header",
    defaultProps: {
        variant: "h3"
    } as Partial<HeaderProps>,
    styles
})(({ children, variant, classes }) => {
    return (
        <Typography variant={variant} className={classes.header}>
            {children}
        </Typography>
    )
})
