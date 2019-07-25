import React from "react"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { Button, ButtonProps } from "./Button"

const stylize = makeStyles((theme: Theme) => ({
    text: {
        color: theme.palette.common.black
    }
}))

export type SecondaryButtonProps = ButtonProps

export const SecondaryButton = ({ ...rest }: SecondaryButtonProps) => {
    const { text } = stylize()
    return <Button textClass={text} variant="outlined" {...rest} />
}
