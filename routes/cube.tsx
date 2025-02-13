import { Head, Partial } from "$fresh/runtime.ts";
import BackButton3D from "../islands/BackButton3D.tsx";
import SpinningCube from "../islands/SpinningCube.tsx";
import { navDiv } from "../utils/signals.tsx";

export const cubeNav = (<Partial name="site-nav">
  <div id="site-nav-container">
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

export default function cubeRoute() {
  return (
    <>
      <Partial name="main-component">
      <Head>
          <meta key= "description" name="description" content={"Refresh Rate Cube"} />

          <title key="title">Refresh Rate Cube</title>

          <link key="canonical" rel="canonical" href={`https://burst.deno.dev/cube`}></link>

          <meta property="og:title" content="Refresh Rate Cube" key="og:title" />
          <meta property="og:description" content="Refresh Rate Based Cube" key="og:description" />
          <meta property="og:url" content={`https://burst.deno.dev/cube`} key="og:url" />
          
        </Head>
        <SpinningCube />
      </Partial>
    </>
  );
}
