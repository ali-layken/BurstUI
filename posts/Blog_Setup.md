## Exploring Fresh
<div style="height: 0.5rem; display: block;"></div>

### Islands
---
<div style="height: 0.5rem; display: block;"></div>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Fresh is an amazing tool that lets you easily build websites like the one you're on now! Fresh <a target="_blank" rel="noopener noreferrer" href="https://deno.com/blog/intro-to-islands">focuses on Islands</a>, which make it easy to specify what should be processed on the Server versus the Client. I want to write blog posts, like the one you are reading now, in simple Markdown. However, I also want to send you non-text content like this cube below. To do this, I will have to partially convert the Markdown over here, and have you fill out the rest over there, on an **Island**. I will be trying my best while building this site to send you the website components with heavy lifting:

{{SpinningCube}}

Over here on the Server, I'll just focus on getting the static content (text) ready and delivered while your browser does the dynamic content (cube). This dramatically affects how fast each page loads since I only have to compute the text to send you including the code (text) for the cube. I wont have to run any code related to generating the cube. Your browser will immediately display the static text and then start running the code to display the above SpinningCube.

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

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Above, `BlogRendererSS`, is a Markdown-to-HTML renderer that will run on the Server when you request a blog post. The markdown is converted and sent along with `DynamicMarkdownItem` which replaces <code>**\{\{SpinningCube}\}**</code> with the corresponding Island. `DynamicMarkdownItem` itself is an Island, which means it will run in your browser, the Client, and replace <code>**\{\{SpinningCube}\}**</code> with the actual code that displays the cube. This completes our goal of having a simple-but-dynamic blogging system that effectively separates Server and Client work.

![This Post's SpinningCube Island in Markdown](/ComponentsInMarkdown.png)
<div style="height: 0.5rem; display: block;"></div>

### Slide Back to the Home Page 
---
<div style="height: 0.5rem; display: block;"></div>
this <- 
Deno is a growing and promising land as projects like Fresh evolve. I used <a target="_blank" rel="noopener noreferrer" href="https://deno.com/deploy">Deno Deploy</a> to easily host this website, which is really just <a target="_blank" rel="noopener noreferrer" href="https://github.com/ali-layken/BurstUI/blob/main/posts/Blog_Setup.md">a public GitHub repo</a>, so you can really see how these renderers work if you like. When I say "over here" or refer to the Server, I am talking about <a target="_blank" rel="noopener noreferrer" href="https://deno.com/blog/anatomy-isolate-cloud">a Deno computer somewhere in the cloud</a> that automatically pulls the above GitHub repo whenever there is a change, and runs it. Since I tried Deno last, about 2 years ago, it has greatly improved its integration with existing npm packages. I had **0 package issues** setting up this site.
<br/>
<br/>
Using Islands really helps build a smooth experience by separating computing resources for specific tasks. Deciding what to handle locally and what to send can vary a ton depending on the goal. For example, for security, if I wanted to use an API key to access Google Maps to show a Google Map in a blog post, I could make sure that API connection happens on the Server, and not on an Island on the Client. The homepage will load faster if you got the cube here or this page will load faster if you got the cube there since it is now your cube now! You are now in charge of the Cube Island I’ve sent. The <- island below has a smooth opacity transition on it because **you** are rendering it. Try it out, I am not sending you video frames or animation updates, just the code for you to make your own frames and animations :)
