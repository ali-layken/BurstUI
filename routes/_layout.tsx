import { PageProps } from "$fresh/server.ts";
import ResizeDetector from "../islands/ResizeDetector.tsx";
import { linklist } from "../utils/linklist.ts";
import SiteNavNarrow from "../islands/SiteNavNarrow.tsx";
import SiteNav from "../islands/SiteNav.tsx";


export default function Layout({ Component, route, state }: PageProps) {
    switch (state.isNarrowCookie) {
        case true:
            return (
                    <div id="background-container" class="min-h-screen bg-bgPurple flex flex-col items-center">
                      <div id="wide-top-container"></div> 
                      <div id="main-container"  class="flex-1 w-full max-w-4xl px-5 py-8 bg-bgAqua rounded-md shadow-lg">
                        <div id="wide-nav-container"></div>
                        <div id="component-container" class="invisible">
                                <Component />
                            </div>
                      </div>
                      <div id="wide-bottom-or-narrow-nav-container" class="w-full max-w-4xl"></div>
                      <ResizeDetector currentPage={route} headingsSignal={linklist} isNarrowCookie={true} />
                    </div>
                  );
        case false:
            return (
                    <div id="background-container" class="min-h-screen bg-bgPurple flex flex-col items-center justify-start">
                      <div id="wide-top-container" class="h-12 bg-bgPurple"></div>
                      <div id="main-container" class="max-w-full w-full px-5 flex gap-8 justify-center">
                        <div id="wide-nav-container" class="flex-2 min-w-80 px-4 py-4 top-24 bg-bgAqua rounded-md shadow-lg self-start sticky flex items-center justify-center">
                        </div>
                        <div  id="component-container" class="flex-1 max-w-4xl px-8 py-8 bg-bgAqua rounded-md shadow-lg">
                        <Component />
                        </div>
                      </div>
                      <div id="wide-bottom-or-narrow-nav-container" class="h-12 bg-bgPurple"></div>
                      <ResizeDetector currentPage={route} headingsSignal={linklist} isNarrowCookie={false} />
                    </div>
                  );
        default:
            return (
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
    }

}