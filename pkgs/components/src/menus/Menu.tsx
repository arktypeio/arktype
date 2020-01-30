import React, { cloneElement } from "react"
import { Menu as MuiMenu } from "@material-ui/core"
import { MenuProps as MuiMenuProps } from "@material-ui/core/Menu"
import { MenuItem } from "."

export type MenuProps = Partial<MuiMenuProps> & {
    children: {
        toggle?: JSX.Element
        options: Record<string, () => any>
    }
}

export const Menu = ({ children: { toggle, options }, ...rest }: MenuProps) => {
    const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
    const button = toggle
        ? cloneElement(toggle, {
              onClick: (e: React.MouseEvent<HTMLButtonElement>) =>
                  setAnchor(e.currentTarget)
          })
        : null
    return (
        <div>
            {button}
            <MuiMenu
                anchorEl={anchor}
                open={!!anchor}
                onClose={() => setAnchor(null)}
                {...rest}
            >
                {Object.entries(options).map(([name, onClick]) => (
                    <MenuItem
                        onClick={() => {
                            onClick()
                            setAnchor(null)
                        }}
                        key={name}
                    >
                        {name}
                    </MenuItem>
                ))}
            </MuiMenu>
        </div>
    )
}
