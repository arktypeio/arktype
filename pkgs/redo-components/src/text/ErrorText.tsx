import React from "react"
import { Theme, Typography, Tooltip } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { listify } from "redo-utils"
import { Text } from "./Text"

const stylize = makeStyles((theme: Theme) => ({
    errorMessage: {
        color: theme.palette.error.main,
        whiteSpace: "pre-line"
    },
    tooltip: {
        backgroundColor: "white",
        border: "2px solid black"
    }
}))

export type ErrorTextProps = {
    children: string | string[]
}

export const ErrorText = ({ children }: ErrorTextProps) => {
    const { errorMessage, tooltip } = stylize()
    const messages = listify(children).filter(child => !!child.trim())
    return (
        <Tooltip
            classes={{ tooltip }}
            title={messages.map((message, index) => (
                <ErrorText key={index}>{`${message}\n`}</ErrorText>
            ))}
        >
            <Text variant="caption" className={errorMessage} noWrap>
                {messages.length > 1
                    ? `🤯${messages[0]} (and more...)`
                    : `🤔${messages[0]}`}
            </Text>
        </Tooltip>
    )
}
