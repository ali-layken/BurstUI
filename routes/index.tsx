import { join } from "node:path";
import SpinningCube from "../islands/SpinningCube.tsx";
import { linklist } from "../utils/linklist.ts";

export interface IndexLink { 
  name: string;
  createdAt: Date; 
}

export default async function Home() {
  const postsDirectory = join(Deno.cwd(), "posts");
  const posts: IndexLink[] = [];

  for await (const entry of Deno.readDir(postsDirectory)) {
    if (entry.isFile && entry.name.endsWith("md") && !entry.name.startsWith('_')) {
      const filePath = join(postsDirectory, entry.name);
      const stat = await Deno.stat(filePath);
      posts.push({
        name: entry.name.slice(0, -3),
        createdAt: stat.birthtime ?? new Date(),
      });
    }
  }

  posts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  linklist.value = posts;

  return (
    <>
      <h1 class="text-8xl text-black font-bold mb-2">Burst.</h1>
      <div style="height: 0.75rem; display: block;"></div>
      <p class="text-accLiteGreen text-xl">
        This space is dedicated to brevity and clarity: turning my nonsensical &
        spontaneous adventures into something you can grasp, benefit from, and
        share. If I ever do something cool, I truly want you to be able to do it
        too!
      </p>
      <SpinningCube />
      <div style="height: 0.75rem; display: block;"></div>
    </>
  );
}
