import React, { useEffect, useRef } from "react"
import { Card, CardProps } from "./Card"
import { Theme } from "@material-ui/core"
import { useTheme, makeStyles } from "@material-ui/styles"
import { component } from "blocks"

export type CardPageProps = CardProps

export const CardPage = component({
    name: "CardPage",
    defaultProps: {} as Partial<CardPageProps>
})(({ children, classes, ...rest }) => {
    const theme = useTheme<Theme>()
    return (
        <Card
            width={theme.spacing(45)}
            height={theme.spacing(50)}
            padding={`${theme.spacing(3)}px ${theme.spacing(5)}px`}
            {...rest}
        >
            {children}
        </Card>
    )
})
