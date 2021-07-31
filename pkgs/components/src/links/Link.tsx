import React from "react"
import {
    Link as RouterLink,
    LinkProps as RouterLinkProps
} from "react-router-dom"
import MuiLink, { LinkProps as MuiLinkProps } from "@material-ui/core/Link"

export type LinkProps = MuiLinkProps & {
    to: string
}

const InnerLink = React.forwardRef<RouterLink, RouterLinkProps>(
    (props, ref) => <RouterLink {...props} />
)

export const Link = (props: LinkProps) => (
    <MuiLink component={InnerLink} {...(props as any)} />
)
