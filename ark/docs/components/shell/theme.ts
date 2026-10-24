export type Theme = "dark" | "light"

/** holds a theme only while it differs from the system's */
export const themeKey = "ark-theme"

export const lightQuery = "(prefers-color-scheme: light)"

/** each theme's --bg, for the browser chrome */
export const themeColors: Record<Theme, string> = {
	dark: "#080d17",
	light: "#f9f5d7"
}

/**
 * Runs in the head before first paint (see app/layout.tsx): marks the theme
 * the visitor chose, or their system's, and follows the system's while they
 * haven't chosen.
 */
export const themeScript = `(function(){var d=document.documentElement,q=matchMedia(${JSON.stringify(lightQuery)}),s=function(){try{return localStorage.getItem(${JSON.stringify(themeKey)})}catch(e){}},c=s();d.dataset.theme=c==="light"||c==="dark"?c:q.matches?"light":"dark";q.addEventListener("change",function(e){if(!s())d.dataset.theme=e.matches?"light":"dark"})})();`
