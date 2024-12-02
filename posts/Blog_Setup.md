## Exploring Fresh and 3JS
<div style="height: 0.5rem; display: block;"></div>

### Islands
---
<div style="height: 0.5rem; display: block;"></div>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Fresh is an amazing web framework that <a href="https://deno.com/blog/intro-to-islands">focuses on islands</a>. Islands let you easily seperate components that will render on the Server and components that will render on the Client. I will be trying my best while building this site to send you the components with heavy lifting:

{{SpinningCube}}

To keep page loads speedy over here on the server I'll just focus on getting the static content ready and delivered to you. If you loaded the home page before visiting the post you'll see in youor browser's Network graph that the `SpinningCube` component was only grabbed once since you will be the one rendering that component. The red line indicates when this post page was visited:

![Network Graph](/secondvisit.png)

### Dynamic Routing
---
<div style="height: 0.5rem; display: block;"></div>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Ok so now I can reuse islands across the website without sending you the code every time. Now I want to setup an easy blog system that doesnt require much to make a new post. Personally I want to write posts in Markdown, but I want the ability to send you anything like the cube above. To faccilitate for this I built a markdown renderer that takes in the `.md` files in `posts`.
<br/>
<br/>
To get an efficient blog setup I'll be combining Islands with <a href="https://fresh.deno.dev/docs/getting-started/dynamic-routes">Fresh's other nice feature</a> that I've had the grace of using before in <a href="https://docs.expo.dev/develop/file-based-routing/">Expo</a>. Using `File Based Routing`, to render this page I have just made a folder called `posts` and made a file in it called `Blog_Setup.md`.

![Fresh Project Directory Tree](/blogtree.png)

To get another post to show up on my home page i just have to add another markdown file in the posts folder and it'll be displayed on my homepage and its route will be supported. <a href="/blog/fakepost">Going to a post I haven't made yet</a> would dynamically fail.
<div style="height: 0.5rem; display: block;"></div>

### Combining Them
---
<div style="height: 0.5rem; display: block;"></div>

![postname imports](/islandimport.png)

Above (`BlogRendererSS`) is a markdown to HTML renderer that I have sourced as a component, which means, when it used in another component, it will be rendered Server side. The `DynamicMarkdownItem` replaces \{\{SpinningCube}\} with the corresponding Island. Since its and island the cube isnt rendered. Finally when your computer loads the blog page, it fills in the <SpinningCube> component with the `island-SpinningCube.js` you have already reccived.

![Markdown file with HTML Component](/ComponentsInMarkdown.png)

Using Islands really helps build a smooth experience by seperating computing resources for specific tasks. Deciding what to work on and what to send can vary a ton depending on the goal. For example, for security, if I wanted to use an API key to access google map to show a Google Map in a blog post I could make sure that API connection happens on the Server and not on an island on the Client. Check out how smooth the opacity transition on this back link below is because you are rendering it I am not sending you any of the freames...

