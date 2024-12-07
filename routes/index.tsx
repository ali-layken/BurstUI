import { join } from "node:path";
import SpinningCube from "../islands/SpinningCube.tsx";

export default async function Home() {
  const postsDirectory = join(Deno.cwd(), "posts");
  const posts: { name: string; createdAt: Date }[] = [];

  for await (const entry of Deno.readDir(postsDirectory)) {
    if (entry.isFile && entry.name.endsWith("md")) {
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
      <p class="text-white">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I believe Excellence lies in simplicity. I feel a special loss when seeeing something Amazing that can't be shared. To avoid creating uncommunicable systems, I wish to share my every step with you, my welcome Visitor.</p>
      <br/>
      <p class="text-accLiteGreen">This space is dedicated to brevity and clarity: turning my nonsensical adventures into something anyone can grasp, benefit from, and share. If I ever do something cool, I truly want you to be able to do it too!</p>
      <SpinningCube />
      <div style="height: 0.75rem; display: block;"></div>
      <ul>
        {posts.map((post, index) => (
          <li key={post.name} class="mb-4 flex items-baseline">
            <span class="text-xl font-bold text-subtitles mr-2">
              {index + 1}.
            </span>
            <a
              href={`/blog/${post.name}`}
              class="text-accGreen hover:text-accRed hover:underline text-xl transition-colors duration-200"
            >
              {post.name.replace(/_/g, " ").toUpperCase()}
            </a>
            <span
              class="text-sm text-subtitles ml-2 relative"
              style={{ top: "-0.13em" }}
            >
              {" <- "}
              {new Date(post.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
