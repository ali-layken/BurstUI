import { Partial } from "$fresh/runtime.ts";
import BackButton3D from "../islands/BackButton3D.tsx";
import SpinningCube from "../islands/SpinningCube.tsx";

export default function cubeRoute() {
  return (
    <>
      <Partial name="site-nav">
      <div id="site-nav-container" class="hidden">
        <BackButton3D />
      </div>
      </Partial>
      <Partial name="main-component">
        <SpinningCube />
      </Partial>
    </>
  );
}
