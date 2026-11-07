import React from 'react';
import { Sequence } from 'remotion';
import { BackgroundAtmosphere } from './components/BackgroundAtmosphere';
import { Scene1_Freeze } from './components/Scene1_Freeze';
import { Scene2_Extraction } from './components/Scene2_Extraction';
import { Scene3_Save } from './components/Scene3_Save';
import { Scene4_Pair } from './components/Scene4_Pair';
import { Scene5_Phone } from './components/Scene5_Phone';
import { Scene6_FsrsCurve } from './components/Scene6_FsrsCurve';
import { Scene7_Proof } from './components/Scene7_Proof';
import { Scene8_Payoff } from './components/Scene8_Payoff';

export const SubStreamEduReel: React.FC = () => {
  return (
    <BackgroundAtmosphere>
      {/* Scene 1: THE FREEZE (00:00 - 00:03, frames 0 - 90) */}
      <Sequence from={0} durationInFrames={90}>
        <Scene1_Freeze />
      </Sequence>

      {/* Scene 2: THE EXTRACTION (00:03 - 00:06, frames 90 - 180) */}
      <Sequence from={90} durationInFrames={90}>
        <Scene2_Extraction />
      </Sequence>

      {/* Scene 3: THE SAVE (00:06 - 00:09, frames 180 - 270) */}
      <Sequence from={180} durationInFrames={90}>
        <Scene3_Save />
      </Sequence>

      {/* Scene 4: THE PAIR (00:09 - 00:12, frames 270 - 360) */}
      <Sequence from={270} durationInFrames={90}>
        <Scene4_Pair />
      </Sequence>

      {/* Scene 5: THE PHONE (00:12 - 00:15, frames 360 - 450) */}
      <Sequence from={360} durationInFrames={90}>
        <Scene5_Phone />
      </Sequence>

      {/* Scene 6: THE CURVE (00:15 - 00:18, frames 450 - 540) */}
      <Sequence from={450} durationInFrames={90}>
        <Scene6_FsrsCurve />
      </Sequence>

      {/* Scene 7: THE PROOF (00:18 - 00:20, frames 540 - 600) */}
      <Sequence from={540} durationInFrames={60}>
        <Scene7_Proof />
      </Sequence>

      {/* Scene 8: THE PAYOFF (00:20 - 00:22, frames 600 - 660) */}
      <Sequence from={600} durationInFrames={60}>
        <Scene8_Payoff />
      </Sequence>
    </BackgroundAtmosphere>
  );
};
