import React from "react"
import { Typography, Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { TypographyProps } from "@material-ui/core/Typography"

const stylize = makeStyles((theme: Theme) => ({
    header: {
        color: theme.palette.secondary.main
    }
}))

export type HeaderProps = {
    variant?: TypographyProps["variant"]
    children: string
}

export const Header = ({ children, variant = "h3" }: HeaderProps) => {
    const { header } = stylize()
    return (
        <Typography variant={variant} className={header}>
            {children}
        </Typography>
    )
}
