// Written on the frame loop, read on a slow interval by the dev overlay.
// Plain object on purpose: no React, no subscriptions at 60fps.
export const perfStats = { calls: 0, triangles: 0, fps: 0 };
