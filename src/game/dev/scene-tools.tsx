import { DevSceneHandle } from './scene-handle';
import { DevStatsSampler } from './stats';

// In-canvas counterpart of DevPanel.
export const DevSceneTools = () => (
  <>
    <DevStatsSampler />
    <DevSceneHandle />
  </>
);
