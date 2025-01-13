import { defineRoute, RouteConfig } from "$fresh/server.ts";
import cubeRoute from "../cube.tsx";

export const config: RouteConfig = {
    skipAppWrapper: true,
    skipInheritedLayouts: true,
  };


export default defineRoute(cubeRoute);