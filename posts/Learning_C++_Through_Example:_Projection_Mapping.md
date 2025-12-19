# All According to Plan...

<br />

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I was trying to learn some `c++` & `make`, for the beginnings of a long journey that I have ahead of me as I try to become more familiar with the computing world :computer::earth_africa: that we live in and where it came from. [This branch](https://github.com/kr15h/ofxPiMapper/pull/191) I was making for this post crashes after 5 hours on my target machine (Acer Chromebook 14) so I waited all year to write a blog post. I wanted to start a cycle :arrows_counterclockwise: where I mess around with an interst -> which leads me to a project -> then after its done I would take a break to reflect and float :leaves: on to the next area that the experince pushed me towards. However, this project didn't exactly go as planned, so my imagined routine was shattered and and this site fell silent...

<br />

But hey. **It doesn't matter**. I felt like I had nothing to share because I only want to bring you the best experiences to learn from. This feeling pushed me away from writing, but as I naturally came into contact with new ideas my mind :brain: started turning. Eventually, I did do something that I really did want to share -> a large checkpoint in the journey i mentioned earlier.-So I opened up this website saw this stub of a post and thought, hey, I actually did learn a ton that I want to share while working on this! It's not right to only share things that I consider working since thats not how life works. Programming is not about making money and tools for businesses. This project helps with fun visual performances...not shareholder value. 

## Fun the hard way: limited resources

<br />

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;My branch is 100% solvalble, but at **some** sort of cost: I could have spent a lot more time on arch-specific, non-`c++`, related solutions that woulden't have ever really worked as maybe they were meant to... 

<br />

Why would we want XSource captures on a pi? On my target machine, I was using a basic browser to render the shaders on shadertoy [1](https://www.shadertoy.com/view/ltfGD7) [2](https://www.shadertoy.com/view/Mly3WV). It was just too much to ask the chromebook to generate images & map them. The pi / host connected to the projector should really only be the projection mapper; the one warping the sources correctly :triangular_ruler: to make them appear flat. The source of what is being projected should be remote and more powerful but these solutions introduce the need for streaming and its laggy effects. 

<br />

The shadertoy ui offers the ability to reccord the frames produced and save them as a `.gif`! The project that I chose to work with, [`ofxPiMapper`](https://github.com/kr15h/ofxPiMapper) is great at mapping `.gifs` using low-power pis. However, if we really wanted, for example to only animate the shader when people move using a camera; if we wanted to generate the frames to be mapped instead of using pre-generated frames, inheritly, `ofxPiMapper` might not be the best best for us in this case. The server-client extensions for `ofxPiMapper` only offer remote-control, not remote content streaming. 

# What I could

<br />

XSource is a new source extension for `ofxPiMapper` that lets you pick any open X11 window as a mapping source. Really all I wrote was this 1 gstreamer pipeline, the rest was all pretty much made for me. I copied the [basic source example](https://github.com/kr15h/ofxPiMapper/tree/master/example_basic) and used the [camera source](https://github.com/kr15h/ofxPiMapper/tree/master/example_camera) as a refrence to make a new source, called XSource. I was able to use [ofx std lib's videoUtils.setPipeline()](https://github.com/bakercp/ofxVideoUtils) which took care of running the pipeline for me:
```cpp
    std::string pipeline = "ximagesrc xid=" + std::to_string(targetWindow) + " use-damage=false ! "
                           "video/x-raw,format=BGRx,framerate=60/1 ! queue";
```
[In my branch](https://github.com/kr15h/ofxPiMapper/blob/35b7889e9cfef14918b9123a22e655dc673a791c/example_xwindow/src/XSource.cpp#L16)
In the Xsource's ::update function, called when the application wants a new frame from the source, I read the running gstreamer pipeline and copied the pixels to the texture that ive registerd as my source:
```cpp
if (videoUtils.isFrameNew()) {
        videoPixels = videoUtils.getPixels();

        if (videoPixels.isAllocated()) {
            // Allocate texture once
            if (!videoTexture.isAllocated()) {
                videoTexture.allocate(videoPixels.getWidth(), videoPixels.getHeight(), GL_RGBA);
            }
            // Upload new frame to texture
            videoTexture.loadData(videoPixels);
        }
}
```
[In my branch](https://github.com/kr15h/ofxPiMapper/blob/35b7889e9cfef14918b9123a22e655dc673a791c/example_xwindow/src/XSource.cpp#L32)


## Results

<br />

<div style="
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  max-width: 660px;
  margin: 0 auto;
">

  <video
    controls
    preload="metadata"
    playsinline
    muted
    style="
      width: 100%;
      aspect-ratio: 9 / 16;
      object-fit: cover;
      border-radius: 8px;
    ">
    <source src="/3/show.mp4" type="video/mp4">
  </video>
  [song](https://www.youtube.com/watch?v=b4AvcRZoV84)

  <video
    controls
    preload="metadata"
    playsinline
    muted
    style="
      width: 100%;
      aspect-ratio: 9 / 16;
      object-fit: cover;
      border-radius: 8px;
    ">
    <source src="/3/angle.mp4" type="video/mp4">
  </video>

</div>



tags: Projection, Mapping, C++, pi, visual, effects