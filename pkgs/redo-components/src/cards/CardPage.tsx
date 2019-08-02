import React, { FC } from "react"
import { Card, CardProps } from "./Card"
import { Theme } from "@material-ui/core"
import { useTheme } from "@material-ui/styles"

export type CardPageProps = CardProps

export const CardPage: FC<CardPageProps> = ({ children, classes, ...rest }) => {
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
}
