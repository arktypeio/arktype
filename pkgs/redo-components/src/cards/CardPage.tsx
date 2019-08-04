import React from "react"
import { Card, CardProps } from "./Card"
import { Theme } from "@material-ui/core"
import { useTheme } from "@material-ui/styles"

export type CardPageProps = CardProps

export const CardPage = (props: CardPageProps) => {
    const theme = useTheme<Theme>()
    return (
        <Card
            css={{
                width: theme.spacing(45),
                height: theme.spacing(50),
                padding: `${theme.spacing(3)}px ${theme.spacing(5)}px`
            }}
            {...props}
        />
    )
}
