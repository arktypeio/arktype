import React from "react"
import { Theme } from "@material-ui/core"
import { component } from "blocks"
import { Menu as MuiMenu } from "@material-ui/core"
import { MenuProps as MuiMenuProps } from "@material-ui/core/Menu"
import { MenuItem } from "blocks"

const styles = (theme: Theme) => ({})

export type MenuProps = Partial<MuiMenuProps> & {
    Button: React.ComponentType<{
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
    }>
    options?: Record<string, () => void>
}

export const Menu = component({
    name: "Menu",
    defaultProps: {
        options: {}
    } as Partial<MenuProps>,
    styles
})(({ Button, options, classes, ...rest }) => {
    const [anchor, setAnchor] = React.useState<null | HTMLElement>(null)

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) =>
        setAnchor(e.currentTarget)

    const handleClose = () => setAnchor(null)

    return (
        <>
            <Button onClick={handleClick} />
            <MuiMenu
                anchorEl={anchor}
                open={!!anchor}
                onClose={handleClose}
                {...rest}
            >
                {Object.entries(options!).map(([name, onClick]) => (
                    <MenuItem onClick={onClick} key={name}>
                        {name}
                    </MenuItem>
                ))}
            </MuiMenu>
        </>
    )
})
