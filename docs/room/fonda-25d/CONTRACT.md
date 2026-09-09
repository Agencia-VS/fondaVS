# FondaVS 2.5D custom room contract

This package is the design and approval boundary for the FondaVS projector stage. It does not replace the game engine or authorize paid asset generation.

## Hero and player envelope

- `host-stage` is the hero: a 960×540 fixed-camera board with all active rules visible.
- Team characters occupy screen-space envelopes only. No avatar physics, collision simulation or 3D navigation is introduced.
- The mobile controller remains a separate route and never enters the projector scene.

## Circulation and collision

The “room” is a screen composition, not a walkable 3D space. Props must stay behind the active game surface, and foreground sprites must not occlude rules, scores or the 6×6 memory grid. Collision is therefore an occlusion/clearance contract, not a physics system.

## Production camera and layers

The camera is orthographic in intent: a fixed 960×540 viewport with a shallow perspective impression created by horizon lines, extruded panels and contact shadows. The runtime layers are `far background → fonda midground → playfield → characters → foreground trim`.

## Input and runtime readiness

All input continues to flow through the existing `Action` union and host authority. The renderer receives `PublicRound` only. A future Blender export may replace a visual layer with baked sprites, but it must not add per-frame network/SQL traffic, a WebGL dependency, or changes to game rules.

## Approval state

The Function, Form and Runtime gates remain pending. No Meshy call, Blender export or paid asset generation is authorized by this package.
