import React from "react"
import { Column } from "@re-do/components"

export type PrimaryContentProps = {
    children: React.ReactNode
}

export const PrimaryContent = ({ children }: PrimaryContentProps) => (
    <Column align="center" width={1200} style={{ padding: 24 }}>
        {children}
    </Column>
)
