import "./index.css";
import React from "react";
import { Composition } from "remotion";
import { SubStreamEduReel } from "./SubStreamEduReel";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SubStreamEduReel"
        component={SubStreamEduReel}
        durationInFrames={660}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
