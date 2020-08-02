import React from "react"
import { Column } from "@re-do/components"
import { layout } from "./constants"

export type PrimaryContentProps = {
    children: React.ReactNode
}

export const PrimaryContent = ({ children }: PrimaryContentProps) => (
    <Column
        align="center"
        spacing={4}
        style={{ padding: 24, maxWidth: layout.maxWidth }}
    >
        {children}
    </Column>
)
