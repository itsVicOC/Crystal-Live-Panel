# Third-party rights notice

Crystal Live Panel is an unofficial fan-made project. It is not affiliated with,
endorsed, sponsored, or approved by Nintendo, Creatures Inc., GAME FREAK inc.,
The Pokémon Company, RetroArch, Libretro, or OBS Project.

The MIT License in `LICENSE` applies to the original source code and original
documentation in this repository. It does not grant rights to third-party
names, trademarks, characters, game data, screenshots, or artwork.

Pokémon and related names, characters, logos, and artwork are trademarks and/or
copyrights of their respective owners. The current decorative overlay background
is an AI-generated landscape; its source and prompt are recorded in
`docs/BACKGROUND.md`. The regional map metadata is derived from the
pret/pokecrystal map and landmark tables, with the source revision recorded in
`src/shared/map-data.ts`. The MIT License does not grant rights to the underlying
Pokémon game data. Redistributors are responsible for confirming distribution
rights for third-party material.

The badge source sheet `assets/johto-badges-source.png` reproduces the original
Pokémon Crystal trainer-card badge pixels from pret/pokecrystal revision
`3bc8daa4173e96a7f4011dad3922eb6fa5dad5c6`, `gfx/trainer_card/badges.png`.
`public/badges/johto.svg` preserves those pixels as palette-controlled paths.
These game graphics are third-party material and are not covered by the
project's MIT License. The active palette follows `PREDEFPAL_CGB_BADGE` in
the same revision's `gfx/sgb/predef.pal`.

The Kanto sheet `assets/kanto-badges-source.png` is from pret/pokered revision
`af519899719f0754965776faac0e836a3b906e6d`, `gfx/trainer_card/badges.png`.
`public/badges/kanto.svg` preserves its original Kanto badge shapes, using the
same display palette as the Johto badges. Crystal does not provide a distinct
Kanto badge graphics sheet on its trainer card. The Kanto graphics are also
third-party game material and are not covered by the project's MIT License.

No ROM, save file, BIOS, or extracted Pokémon sprite is included in the source
repository or release package. Sprite images are extracted locally at runtime
from a ROM selected by the user and remain on the user's computer. Users are
responsible for obtaining and using game files lawfully in their jurisdiction.
