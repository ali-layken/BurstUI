import { PageProps } from "$fresh/server.ts";
import { JSX } from "preact/jsx-runtime";
import ResizeDetector from "../islands/ResizeDetector.tsx";
import { linklist } from "../utils/linklist.ts";

export default function App({ Component, route, state }: PageProps): JSX.Element {
  var bodyHTML: JSX.Element;
  switch (state.isNarrowCookie) {
    case true:
      bodyHTML = (
                <div id="background-container" class="min-h-screen bg-bgPurple flex flex-col items-center">
                  <div id="wide-top-container"></div> 
                  <div id="main-container"  class="flex-1 w-full max-w-4xl px-4 py-8 bg-bgAqua rounded-md shadow-lg">
                    <div id="wide-nav-container"></div>
                    <div id="component-container" class="invisible">
                            <Component />
                        </div>
                  </div>
                  <div id="wide-bottom-or-narrow-nav-container" class="w-full max-w-4xl"></div>
                  <ResizeDetector currentPage={route} headingsSignal={linklist} isNarrowCookie={true} />
                </div>
              );
      break;
    case false:
      bodyHTML = (
                <div id="background-container" class="min-h-screen bg-bgPurple flex flex-col items-center justify-start">
                  <div id="wide-top-container" class="h-12 bg-bgPurple"></div>
                  <div id="main-container" class="max-w-full w-full px-4 flex gap-8 justify-center">
                    <div id="wide-nav-container" class="flex-2 w-96 px-4 py-4 top-24 bg-bgAqua rounded-md shadow-lg self-start sticky flex items-center justify-center">
                    </div>
                    <div  id="component-container" class="flex-1 max-w-4xl px-8 py-8 bg-bgAqua rounded-md shadow-lg">
                    <Component />
                    </div>
                  </div>
                  <div id="wide-bottom-or-narrow-nav-container" class="h-12 bg-bgPurple"></div>
                  <ResizeDetector currentPage={route} headingsSignal={linklist} isNarrowCookie={false} />
                </div>
              );
        break;
    default:
      bodyHTML = (
            <div class="layout">
                <div id="background-container" class="min-h-screen bg-bgPurple flex flex-col items-center justify-start">
                    <div id="wide-top-container"></div>
                    <div id="main-container">
                        <div id="wide-nav-container"></div>
                        <div id="component-container" class="invisible">
                            <Component />
                        </div>
                    </div>
                    <div id="wide-bottom-or-narrow-nav-container"></div>
                </div>
                <ResizeDetector currentPage={route} headingsSignal={linklist} isNarrowCookie={undefined} />
            </div>
        );
        break;
}

  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Burst!</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        {bodyHTML}
      </body>
    </html>
  );
}
