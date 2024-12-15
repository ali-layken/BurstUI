import { join } from "node:path";
import SpinningCube from "../islands/SpinningCube.tsx";

export default async function Home() {
  const postsDirectory = join(Deno.cwd(), "posts");
  const posts: { name: string; createdAt: Date }[] = [];

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

  return (
    <>
      <h1 class="text-8xl text-black font-bold mb-2">Burst.</h1>
      <div style="height: 0.75rem; display: block;"></div>
      <p class="text-accLiteGreen">
        This space is dedicated to brevity and clarity: turning my nonsensical &
        spontaneous adventures into something you can grasp, benefit from, and
        share. If I ever do something cool, I truly want you to be able to do it
        too!
      </p>
      <SpinningCube />
      <div style="height: 0.75rem; display: block;"></div>
      <ul>
        {posts.map((post, index) => {
          const isEven = index % 2 === 0; // Calculate once

          return (
            <li key={post.name} class="mb-4 flex items-center justify-between">
              {/* Left Section: Post Number and Name */}
              <div class="flex items-baseline">
                <span
                  class={`text-xl font-bold ${
                    isEven ? "text-subtitles" : "text-accYellow"
                  } mr-2`}
                >
                  {index + 1}.
                </span>
                <a
                  href={`/blog/${post.name}`}
                  class="text-accGreen hover:text-accRed hover:underline text-xl transition-colors duration-200"
                >
                  {post.name.replace(/_/g, " ").toUpperCase()}
                </a>
              </div>

              {/* Right Section: Timestamp */}
              <div
                class={`text-sm ${
                  isEven ? "text-subtitles" : "text-accYellow"
                }`}
              >
                {new Date(post.createdAt).toLocaleString()}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
