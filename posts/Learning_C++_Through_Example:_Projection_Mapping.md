# All According to Plan...

<br />

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;I was trying to learn some `c++` & `make`, for the beginnings of a long journey ahead of me as I try to become more familiar with the computing world :computer::earth_africa: we live in and where it came from. [This branch](https://github.com/kr15h/ofxPiMapper/pull/191) I made for this post, crashes after 5 hours on my target machine (an Acer Chromebook 14 :google_logo:), so I waited all year  tyring to make somthing so that i coudld write this. I wanted to start a cycle :arrows_counterclockwise: where I mess around with an interest -> which leads me to a project -> then after it's done, I would take a break to reflect and float :leaves: on to the next area that the experience pushed me towards. However, this project didn't exactly go as planned, so my imagined routine was shattered, and this site fell silent...

<br />

But hey. **It doesn't matter**. I felt like I had nothing to say because I wanted to only bring you the best experiences to learn from. This feeling pushed me away from writing, but as I naturally came into contact with new ideas, my mind :brain: started turning. Eventually, I did do something I really want to share -> a major checkpoint in the journey I mentioned earlier.-So I opened up this website, saw this stub of a post, and thought, hey, I actually did learn a ton while working on this! It's not right to only share things that I consider working since that's not how life works; in reality, sometimes things don't work out perfectly ⛓️‍💥. Programming is not about making money and tools for businesses. This project helps deliver fun visual performances...not shareholder value. 

### Fun the hard way: limited resources

<br />

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;My branch is 100% solvable, but at **some** sort of cost: I could have spent a lot more time on arch-specific, non-`c++`, related solutions that wouldn’t have ever really worked, as maybe they were meant to... 

<br />

Why would we want X11 captures as a source on a pi :r_pi:? On my target machine, I was using a basic browser to render some shaders on Shadertoy [[1](https://www.shadertoy.com/view/ltfGD7) [2](https://www.shadertoy.com/view/Mly3WV)] & a clock. It was just too much to ask the chromebook to generate images while also capturing & mapping them. The pi / host connected to the projector should really only be the projection mapper; the one warping the sources correctly :triangular_ruler:, to make them appear flat. The source of what is being projected should be remote and more powerful, but these solutions introduce the need for streaming and its laggy effects. 

<br />

The Shadertoy UI offers the option to record frames as they're produced and save them as a `.gif`! The project I chose to work with, [`ofxPiMapper`](https://github.com/kr15h/ofxPiMapper), is great at mapping `.gifs` using low-power pis. However, if we really wanted to, for example, use a camera and only animate the shader when people move :running_woman: or control it with their hands :leftwards_pushing_hand: ; if we wanted to generate the frames to be mapped instead of using pre-generated frames, `ofxPiMapper` might not be the best fit for us. The server-client extensions for `ofxPiMapper` only offer remote control to make mapping easier, not remote content streaming for enhanced experiences.

# What I could do :writing_hand:

<br />

My branch is a new source extension for `ofxPiMapper`, *XSource* that lets you pick any open X11 window and capture what its displaying as a mapping source. Really, all I wrote was this 1 [gstreamer](https://gstreamer.freedesktop.org/) pipeline; the rest was all pretty much made for me. I copied the [basic source example](https://github.com/kr15h/ofxPiMapper/tree/master/example_basic) and used the [camera source](https://github.com/kr15h/ofxPiMapper/tree/master/example_camera) as a reference to make a new source, called XSource. I was able to use [ofx std lib's videoUtils.setPipeline()](https://github.com/bakercp/ofxVideoUtils), which took care of running the pipeline for me:
```cpp
    std::string pipeline = "ximagesrc xid=" + std::to_string(targetWindow) + " use-damage=false ! "
                           "video/x-raw,format=BGRx,framerate=60/1 ! queue";
```
[In my branch :mag:](https://github.com/kr15h/ofxPiMapper/blob/35b7889e9cfef14918b9123a22e655dc673a791c/example_xwindow/src/XSource.cpp#L16)

<br />


In the Xsource's `::update` function, called when the application wants a new frame :framed_picture: from the source, I read the running gstreamer pipeline :potable_water: and copied the pixels to the texture that I've registered as my source:
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
[In my branch :mag:](https://github.com/kr15h/ofxPiMapper/blob/35b7889e9cfef14918b9123a22e655dc673a791c/example_xwindow/src/XSource.cpp#L32)

<br />

I ran the same gstreamer pipeline outside of `ofx` using [gst-launch-1.0](https://gstreamer.freedesktop.org/documentation/tools/gst-launch.html?gi-language=c), and it also crashed after many hours. I couldn't figure out why, and I didn't really care too much at this point since I knew the solution was elsewhere, not in fixing this. This was also my first time trying [arch linux](https://archlinux.org/), so I could just be bad at reading logs and underestimating [my boi EDGAR](https://chromeos.fandom.com/wiki/Acer_Chromebook_14_(edgar))
### Results :bar_chart:

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

</br>

**Note:** I know it seems otherwise but `ofx` is cross-platform. `videoUtils` smartly uses other solutions on Windows :ms_logo: when it can. `ofx` was dope.

</br>

**Note 2:** [Fun Thread](https://github.com/kr15h/ofxPiMapper/issues/169) where all of us were trying to get `ofxPiMapper` up. 

tags: Projection, Mapping, C++, pi, visual, effects, gstreamer