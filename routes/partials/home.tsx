import { defineRoute, RouteConfig } from "$fresh/server.ts";
import homeRoute  from "../index.tsx";


export const config: RouteConfig = {
  skipAppWrapper: true,
  skipInheritedLayouts: true,
};

export default defineRoute(homeRoute)