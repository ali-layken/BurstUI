import { signal } from "@preact/signals";
import { Partial } from "$fresh/runtime.ts";
import { JSX } from "preact/jsx-runtime";
import BackButton3D from "../islands/BackButton3D.tsx";

export const isNarrowSignal = signal<boolean>(false);

export const EmptyNav = (
  <Partial name="site-nav">
    <div id="site-nav-container">
      <BackButton3D />
    </div>
  </Partial>
);

export const navDiv = signal<JSX.Element>(EmptyNav);


