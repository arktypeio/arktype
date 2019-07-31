import React from "react"
import { Text, TextProps } from "./Text"

export type InfoTextProps = TextProps

export const InfoText = ({ children }: InfoTextProps) => (
    <Text align="center">{children}</Text>
)
