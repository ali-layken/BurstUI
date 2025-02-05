import { Partial } from "$fresh/runtime.ts";
import BackButton3D from "../islands/BackButton3D.tsx";
import SpinningCube from "../islands/SpinningCube.tsx";
import { navDiv } from "../utils/signals.tsx";

export default function cubeRoute() {
  navDiv.value = (      <Partial name="site-nav">
    <div id="site-nav-container" class="hidden">
      <div class="ml-2 mt-2 text-left text-subtitles text-sm md:text-xl font-medium font-fixel">
        <span>Refresh Rate Based Cube Speed Change:</span>
        <ul class="ml-6 my-2 space-y-1 list-disc text-accLiteGreen text-base md:text-lg font-medium font-fixel">
        <li>
          <strong>Method 1:</strong> Move the webpage across monitors with different refresh rates.
        </li>
        <li>
          <strong>Method 2:</strong> Change the refresh rate of your variable refresh rate monitor.
        </li>
      </ul>
      </div>
      <BackButton3D />
    </div>
  </Partial>)
  return (
    <>
      <Partial name="main-component">
        <SpinningCube />
      </Partial>
    </>
  );
}
