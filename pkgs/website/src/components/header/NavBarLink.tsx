import React from "react"
import { Text, Link } from "@re-do/components"
import { ListItem, ListItemIcon, ListItemText } from "@material-ui/core"

type NavBarLinkProps = {
    Icon?: React.ComponentType
    text: string
    to: string
    mobile: boolean
}

export const NavBarLink = ({ Icon, text, to, mobile }: NavBarLinkProps) => {
    const contents = mobile ? (
        <ListItem button>
            <ListItemIcon>{Icon ? <Icon /> : null}</ListItemIcon>
            <ListItemText primary={text} />
        </ListItem>
    ) : (
        <Text
            variant="h6"
            style={{
                fontWeight: 700,
                padding: 8
            }}
        >
            {text}
        </Text>
    )
    return to.startsWith("http") ? (
        <a href={to} target="_blank">
            {contents}
        </a>
    ) : (
        <Link to={to}>{contents}</Link>
    )
}
