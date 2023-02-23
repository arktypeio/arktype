# How to update these GIFs

1. Used modified VSCode:
    - Deleted fileName navbar and added `margin-top: 24px` to the editor from devtools within VsCode
    - Enabled Quokka, but disabled "Show Expression Value on Select" (this has to be done every time Quokka is restarted)
    - Applied these settings:

```ts
// DEMO ONLY (revert)
// previously 225
"glassit.alpha": 255,
// previously 1
"window.zoomLevel": 2,
// previously smooth
"editor.cursorBlinking": "solid",
"scm.diffDecorations": "none",
"breadcrumbs.enabled": false,
"editor.minimap.enabled": false,
"editor.scrollBeyondLastLine": false,
// "typescript.suggest.enabled": false,
```

2. Once finished recording, generate a high-quality MP4 from ClipChamp
3. Import the new MP4 into your existing VSDC project
4. Generate `arktypeGithub.apng` as a 1750x750 100% quality APNG based on the existing project (has transparency filters etc.). The GitHub version should have a background of #0d1117, exactly matching GitHub in dark mode
5. Check the github apng to ensure it is exactly #0d1117, then save the VSDC project
6. Disable the transparency mask from within the updated MP4 in VSDC. Change the color of the top rectangle to `#1b1b1b`
7. Generate another `.apng` with the same settings called `arktype.gif`. Ensure the background is exactly `#1b1b1b`
8. Run `arktype.apng` and `arktypeGithub.apng` through the default settings for [GifTuna](https://github.com/dudewheresmycode/giftuna). Ensure the output colors exactly match the ones described and that the GIFs are ~20MB each.
9. Replace arktype.gif and arktypeGithub.gif in (repo-root)/dev/arktype.io/static/img.
