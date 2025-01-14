import { Partial } from "$fresh/runtime.ts";
import BackButton3D from "../islands/BackButton3D.tsx";

export default function snakeRoute() {
  return (
    <>
      <Partial name="site-nav">
        <div id="site-nav-container" class="hidden">
          <h2 class="font-fixel ml-4 mb-2 text-accRed2 text-4xl font-semibold">
            Controls:
          </h2>
          <div class="flex justify-center items-start w-full">
            <div class="ml-2 mb-2 text-subtitles text-xl font-medium font-fixel">
              <div class="flex justify-center items-start flex-wrap w-full">
                <div class="mx-4">
                  <div class="text-left">
                    <span>NE (E)</span>
                  </div>
                  <div class="text-center ml-1 mt-1">
                    <span>↖️</span>
                  </div>
                </div>
                <div class="mx-4">
                  <div class="text-left">
                    <span>NW (W)</span>
                  </div>
                  <div class="text-center mt-1">
                    <span>↗️</span>
                  </div>
                </div>
              </div>
              <div class="flex justify-center items-start flex-wrap w-full mt-4">
                <div class="mx-4">
                  <div class="text-center">
                    <span>↙️</span>
                  </div>
                  <div class="text-left mt-1">
                    <span>SE (D)</span>
                  </div>
                </div>
                <div class="mx-4">
                  <div class="text-center">
                    <span>↘️</span>
                  </div>
                  <div class="text-left mt-1">
                    <span>SW (A)</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="ml-4">
              <div class="text-center text-subtitles text-xl font-medium font-fixel">
                <span>Spacebar (JUMP)</span>
              </div>
              <div class="text-center mt-1">
                <span>🦘</span>
              </div>
              <div class="mt-1 text-left text-accRed2 text-xl font-medium font-fixel">
                <span>Mouse / Touch:</span>
              </div>
              <div class="mt-1 ml-4 text-left text-accYellow text-md font-medium font-fixel">
                <ul class="list-disc space-y-1">
                  <li>Drag = Direction</li>
                  <li>Tap = Jump</li>
                </ul>
              </div>
            </div>
          </div>

          <h2 class="font-fixel ml-4 mb-2 text-accRed2 text-4xl font-semibold">
            How to Play:
          </h2>
          <ul class="ml-6 mb-2 space-y-1 list-disc text-accLiteGreen text-lg font-medium font-fixel">
            <li>
              Input the direction you want to go before you reach the next
              tile's midpoint dot.
            </li>
            <li>
              You can overwrite the direction you chose with any other direction
              before reaching the next dot.
            </li>
            <li>
              Jumping will always make you jump over the next tile. You can
              combine it with a direction to choose where you'll land.
            </li>
          </ul>

          <div class="flex justify-between items-start w-full">
            <div class="ml-2">
              <h2 class="font-fixel mb-2 text-accRed2 text-4xl font-semibold">
                Losing:
              </h2>
              <ol class="space-y-1 ml-4 list-decimal text-lg font-medium font-fixel">
                <li class="text-subtitles">Crashing into yourself</li>
                <li class="text-accYellow">Falling off the map</li>
              </ol>
            </div>
            <div class="mr-2 text-right">
              <h2 class="font-fixel mb-2 text-accRed2 text-4xl font-semibold">
                Winning:
              </h2>
              <ul class="space-y-1 text-lg font-medium font-fixel text-accRed2">
                <li class="flex justify-between items-center">
                  <span class="text-right flex-grow">???</span>
                  <span class="ml-2 text-[8px]">●</span>
                </li>
              </ul>
            </div>
          </div>
          <BackButton3D />
        </div>
      </Partial>
      <Partial name="main-component">
        <div
          style={{
            width: "100%",
            height: "75vh",
            backgroundColor: "black",
            overflow: "hidden", // Ensure parent doesn't allow scrollbars
            scrolling: "no", // Optional: Explicitly disable scrolling
          }}
        >
          {/* Embed the Godot game via iframe */}
          <iframe
            src="/snake/index.html"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              overflow: "hidden", // Prevent iframe content from causing scrollbars
              scrolling: "no", // Optional: Explicitly disable scrolling
            }}
            title="Godot Game"
          >
          </iframe>
        </div>
      </Partial>
    </>
  );
}
