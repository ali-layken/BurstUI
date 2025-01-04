import { join } from "node:path";
import AnimatedText3D from "../islands/AnimatedText3D.tsx";
import { linklist } from "../utils/linklist.ts";

export interface IndexLink { 
  name: string;
  modifiedAt: Date; 
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
        modifiedAt: stat.mtime ?? new Date(),
      });
    }
  }

  posts.sort((a, b) => a.modifiedAt.getTime() - b.modifiedAt.getTime());
  linklist.value = posts;

  return (
    <>
      <AnimatedText3D text="Burst."  fontPath="/Teko/Teko-Light_Regular.json"/>
      <p class="text-accLiteGreen text-xl">
        <strong>Welcome</strong>, my <em>digitally wandering</em> visitor! This space is dedicated to turning my nonsensical &
        spontaneous adventures into something you can benefit from. If I ever do something cool,
        I truly want you to be able to do it too!
      </p>
    </>
  );
}
