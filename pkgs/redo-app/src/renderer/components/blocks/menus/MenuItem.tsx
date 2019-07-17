import React from "react"
import { Theme } from "@material-ui/core"
import { component } from "blocks"
import { MenuItem as MuiMenuItem } from "@material-ui/core"
import { MenuItemProps as MuiMenuItemProps } from "@material-ui/core/MenuItem"

const styles = (theme: Theme) => ({})

export type MenuItemProps = MuiMenuItemProps & {}

export const MenuItem = component({
    name: "MenuItem",
    defaultProps: {} as Partial<MenuItemProps>,
    styles
})(React.forwardRef((props, ref) => <MuiMenuItem ref={ref} {...props} />))
