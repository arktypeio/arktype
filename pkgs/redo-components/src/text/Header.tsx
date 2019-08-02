import React from "react"
import { Text, TextProps } from "./Text"

export type HeaderProps = TextProps

export const Header = ({
    variant = "h3",
    color = "secondary",
    ...rest
}: HeaderProps) => <Text variant={variant} color={color} {...rest} />
