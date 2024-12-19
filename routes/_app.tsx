import { type PageProps } from "$fresh/server.ts";
import { JSX } from "preact/jsx-runtime";
import SiteNav from "../islands/SiteNav.tsx";
import { useRef } from "preact/hooks"; 
import { linklist } from "../utils/linklist.ts";

export default function App({ Component, route, }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Burst!</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        {/* Outer wrapper to maintain purple background */}
        <div class="min-h-screen bg-bgPurple flex flex-col items-center justify-start">
          {/* Add space above */}
          <div class="h-12 bg-bgPurple"></div>

          {/* Flex container */}
          <div class="max-w-full w-full px-4 flex gap-8 justify-center">
            {/* Left smaller div */}
            <div class="flex-2 px-4 py-4 top-24 bg-bgAqua rounded-md shadow-lg self-start sticky flex items-center justify-center">
              <SiteNav currentPage={route} headingsSignal={linklist}/>
            </div>
            {/* Right larger div */}
            <div class="flex-1 max-w-4xl px-8 py-8 bg-bgAqua rounded-md shadow-lg">
              <Component />
            </div>
          </div>

          {/* Add space below */}
          <div class="h-12 bg-bgPurple"></div>
        </div>
      </body>
    </html>
  );
}
