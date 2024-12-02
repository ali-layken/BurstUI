## Exploring Fresh
<div style="height: 0.5rem; display: block;"></div>

### Islands
---
<div style="height: 0.5rem; display: block;"></div>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Fresh is an amazing web framework that <a target="_blank" rel="noopener noreferrer" href="https://deno.com/blog/intro-to-islands">focuses on Islands</a>. Islands let you easily seperate components that will render on the Server and components that will render on the Client. I will be trying my best while building this site to send you the components with heavy lifting:

{{SpinningCube}}

To keep page loads speedy over here on the Server I'll just focus on getting the static content rendered and delivered while your computer (phone=compter) runs the rest. A Blog is a splendid! Personally I want to write posts in Markdown, but I want the ability to send you anything like the cube above which needs to render on your machine. We will have to render the Markdown partially over here and have you render the rest over there. Theres another Island below we will use to explore some other benefits...

### Dynamic Routing
---
<div style="height: 0.5rem; display: block;"></div>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Next, I want to setup an easy blog system that doesnt require much to make a new post. To faccilitate for this I built a Markdown renderer that takes in the `.md` files in `posts` and turns them into HTML. So far, I have just made a folder called `posts` and made a file in it called `Blog_Setup.md` that turns into this page:

![Fresh Project Directory Tree](/blogtree.png)

Using <a target="_blank" rel="noopener noreferrer" href="https://fresh.deno.dev/docs/getting-started/dynamic-routes">`Dynamic Routing`</a>, Fresh dynamically generates endpoints for each `.md` in the folder. To get another post to show up on my home page i just have to add another Markdown file in the posts folder and it'll be displayed on my homepage and its route will be supported. Going to <a target="_blank" rel="noopener noreferrer" href="/blog/fakepost">a post I haven't made yet</a> would dynamically fail.
<div style="height: 0.5rem; display: block;"></div>

### Combination - Islands in Blog Posts 
---
<div style="height: 0.5rem; display: block;"></div>

![postname imports](/islandimport.png)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Above `BlogRendererSS` is a Markdown to HTML renderer that I have sourced as a component, which means, when it is used in another component, it will be rendered Server side. The `DynamicMarkdownItem` replaces \{\{SpinningCube}\} with the corresponding Island, and is itself an Island, which means, when it is used in another component it will be rendered Client side. I send you rendered text and you render the cube. This completes our goal of having a simple-but-dynamic blogging system that effectively sepereates Server and Client work.

![Markdown file with HTML Component](/ComponentsInMarkdown.png)

Deno is growing promisng land as projects like Fresh evolve. I used <a target="_blank" rel="noopener noreferrer" href="https://deno.com/deploy">Deno Deploy</a> to easily host this website which is really just <a target="_blank" rel="noopener noreferrer" href="https://github.com/ali-layken/BurstUI/blob/main/posts/Blog_Setup.md">hosted on github repo</a> so you can really see how these rendereres work if you like. Since I tried Deno last about 2 years ago it has greatly improved integration with npm. I had 0 package issues setting up this site (3js, tailwind, marked, fresh).
<br/>
<br/>
Using Islands really helps build a smooth experience by seperating computing resources for specific tasks. Deciding what to locally and what to send can vary a ton depending on the goal. For example, for security, if I wanted to use an API key to access google map to show a Google Map in a blog post I could make sure that API connection happens on the Server and not on an Island on the Client. Check out how smooth the opacity transition on this back link below is because **you** are rendering it. I am not sending you any frames or anything just the code...

