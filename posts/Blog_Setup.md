## Exploring Fresh
<div style="height: 0.5rem; display: block;"></div>

### Islands
---
<div style="height: 0.5rem; display: block;"></div>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Fresh is an amazing web framework that <a target="_blank" rel="noopener noreferrer" href="https://deno.com/blog/intro-to-islands">focuses on Islands</a>. Islands make it easy to specify what should render on the Server versus the Client. I will be trying my best while building this site to send you the components with heavy lifting:

{{SpinningCube}}

To keep page loads speedy, over here on the Server, I'll just focus on getting the static content rendered and delivered, while your browser runs the rest, like the cube above. A blog is a splendid example for Islands! I want to write the posts in simple Markdown, but I want the ability to embed anything which needs to run on your machine. We will have to render the Markdown partially over here and have you render the rest over there on an **Island**. There’s another Island below we will use to explore some other benefits...

### Dynamic Routing
---
<div style="height: 0.5rem; display: block;"></div>
<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Next, I want to set up a blog system where I can easily make new posts. To facilitate this, I built a Markdown renderer that takes in the <code>.md</code> files in <code>posts</code> and turns them into HTML. So far, I have just made a single file in <code>posts</code> called <code>Blog_Setup.md</code> that automatically turns into the page we are on now:</p>

![Fresh Project: Directory Tree](/blogtree.png)

Using <a target="_blank" rel="noopener noreferrer" href="https://fresh.deno.dev/docs/getting-started/dynamic-routes">dynamic routing</a>, Fresh will serve <code>*Post_Title*.md</code> as HTML when you visit its corresponding <code>/blog/*Post_Title*</code>. I just have to add another Markdown file in the <code>posts</code> folder for another item to show up on the homepage and its route will automatically work. Going to <a target="_blank" rel="noopener noreferrer" href="/blog/fakepost">a post I haven’t made yet</a> would also dynamically fail.
<div style="height: 0.5rem; display: block;"></div>

### Combination - Islands in Blog Posts 
---
<div style="height: 0.5rem; display: block;"></div>

![<code>/blog/[postname].tsx</code> Imports](/islandimport.png)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Above, `BlogRendererSS` is a Markdown-to-HTML renderer that I have sourced as a component, which means, when it is used in another component, it will be rendered Server side. The `DynamicMarkdownItem` replaces <code>**\{\{SpinningCube}\}**</code> with the corresponding Island, and is itself an Island, which means, when it is used in another component, it will be rendered Client side. I send you rendered text and you render the cube. This completes our goal of having a simple-but-dynamic blogging system that effectively separates Server and Client work.

![This Post's SpinningCube Island in Markdown](/ComponentsInMarkdown.png)
<div style="height: 0.5rem; display: block;"></div>

### Slide Back to the Home Page 
---
<div style="height: 0.5rem; display: block;"></div>

Deno is a growing and promising land as projects like Fresh evolve. I used <a target="_blank" rel="noopener noreferrer" href="https://deno.com/deploy">Deno Deploy</a> to easily host this website, which is really just <a target="_blank" rel="noopener noreferrer" href="https://github.com/ali-layken/BurstUI/blob/main/posts/Blog_Setup.md">a GitHub repo</a>, so you can really see how these renderers work if you like. When I say "over here" or refer to the Server, I am talking about <a target="_blank" rel="noopener noreferrer" href="https://deno.com/blog/anatomy-isolate-cloud">a Deno computer somewhere in the cloud</a> that automatically pulls the above repo whenever there is a change, and runs it. Since I tried Deno last, about 2 years ago, it has greatly improved its integration with existing npm packages. I had **0 package issues** setting up this site.
<br/>
<br/>
Using Islands really helps build a smooth experience by separating computing resources for specific tasks. Deciding what to handle locally and what to send can vary a ton depending on the goal. For example, for security, if I wanted to use an API key to access Google Maps to show a Google Map in a blog post, I could make sure that API connection happens on the Server and not on an Island on the Client. The homepage will load faster if you got the cube here or this page will load faster if you got the cube there since it is now your cube now! You are now in charge of the Cube Island I’ve sent. Check out how smooth the opacity transition on this back link below is because **you** are rendering it. I am not sending you any frames or model data or anything, just the code to render each object...
