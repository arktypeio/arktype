import React, { FC } from "react"
import { Tooltip } from "@material-ui/core"
import { TooltipProps } from "@material-ui/core/Tooltip"
import { listify, ValueFrom } from "redo-utils"
import { Text, TextProps } from "./Text"
import { useTheme, makeStyles, Theme } from "../styles"

const stylize = makeStyles((theme: Theme) => ({
    tooltip: {
        backgroundColor: "white",
        border: "2px solid black"
    }
}))

export type ErrorTextProps = TextProps & {
    children: string | string[]
    tooltipPlacement?: ValueFrom<TooltipProps, "placement">
    tooltipProps?: TooltipProps
}

export const ErrorText: FC<ErrorTextProps> = ({
    children,
    tooltipPlacement,
    tooltipProps,
    ...rest
}) => {
    const { tooltip } = stylize()
    const theme = useTheme()
    const messages = (listify(children) as string[]).filter(
        child => !!child.trim()
    )
    return (
        <Tooltip
            classes={{
                tooltip
            }}
            title={messages.map((message, index) => (
                <ErrorText key={index}>{`${message}\n`}</ErrorText>
            ))}
            placement={tooltipPlacement}
            {...tooltipProps}
        >
            <Text
                variant="caption"
                style={{
                    color: theme.palette.error.main,
                    whiteSpace: "pre-line"
                }}
                noWrap
                {...rest}
            >
                {messages.length > 1
                    ? `🤯${messages[0]} (and more...)`
                    : `🤔${messages[0]}`}
            </Text>
        </Tooltip>
    )
}
