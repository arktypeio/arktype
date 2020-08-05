import React from "react"
import Link from "@docusaurus/Link"
import { Text } from "@re-do/components"

export type NavBarLinkProps = {
    children: React.ReactNode
    to: string
    external?: boolean
}

export const NavBarLink = ({ to, children, external }: NavBarLinkProps) => (
    <Text
        variant="h6"
        style={{
            fontWeight: 700,
            paddingRight: 16
        }}
    >
        {external ? (
            <a href={to} target="_blank">
                {children}
            </a>
        ) : (
            <Link to={to}>{children}</Link>
        )}
    </Text>
)
