# Paper Planet — studio atlas

The design follows the user's two video references, inspected directly:
- [Alpine Lake](https://x.com/Bengiyai/status/2120966379285205405): pale studio canvas, dimensional central subject, large italic serif typography, generous space and a compact floating control panel.
- [Living Earth](https://x.com/iamfakhrealam/status/2121996471830818966): textured globe, atmospheric rim, directional lighting and broad, softly fading lens flares.

Paper Planet combines that studio composition with an editorial reading column. Its WebGL Earth uses a geographic texture, directional shading and a subtle blue atmosphere; D3 provides matching pin coordinates and a vector fallback. World map switches to a fixed Natural Earth projection with all news locations visible. The surface remains useful without WebGL.

Tokens: paper #efeee8, ink #29352f, muted #66706a, field #e3e5df, line #d6dad2. Newsreader italic display type and DM Sans interface text. The floating perspective panel groups projection, orbit pause and speed. On mobile, the map precedes the reading column and controls simplify.

## Ambient discovery
Default rotation is 2 degrees per second, adjustable from 0.5 to 4. A filtered story within 35.5 degrees of center earns a 2.2-second preview, with a 90-second repeat cooldown and 4.5-second quiet interval. Rotation continues during highlights. Hover/focus holds the preview's position and lifetime for reading without stopping rotation. Opening it marks the story explored.

Direct manipulation, reading, searching, hidden tabs, offscreen maps, World map mode and reduced-motion preferences suspend orbit. A visible toggle pauses discovery. Soft horizontal light streaks and warm blooms appear at irregular intervals and fade naturally. Reduced motion suppresses these effects. No autonomous preview changes read progress.

Navigation lasts 650ms; controls respond in 160ms. Reduced motion makes navigation immediate. Ambient redraws are capped at 30fps and canvas pixel density at 1.5.
