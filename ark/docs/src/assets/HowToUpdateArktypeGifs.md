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

2. Once finished recording, generate a high-quality MP4 from ClipChamp called `arktype.mp4`. This MP4 should have a #1b1b1b background, and can be used directly on arktype.io.
3. Import the new MP4 into your existing VSDC project
4. Generate `arktype.apng` as a 1750x750 100% quality MP4/MOV/APNG etc. based on the existing project (has transparency filters etc.). The GitHub version should have a background of #0d1117, exactly matching GitHub in dark mode. You should experiment with multiple output formats until you ensure that #0d1117 is exactly the background. E.g. for GIFs, you can check the palette to ensure it is there ahead of time.
5. Check `arktype.apng` to ensure it is exactly #0d1117, then save the VSDC project
6. Run `arktype.apng` through [GifTuna](https://github.com/dudewheresmycode/giftuna) with "Dither" disabled. Ensure the output background is still the same and that the GIF is ~20MB, and name the result `arktype.gif`.
7. Replace `arktype.mp4` and `arktype.gif` in (repo-root)/dev/arktype.io/static/img.
