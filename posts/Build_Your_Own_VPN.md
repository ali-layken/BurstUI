## Exploring DNS

### Arch Linux
I was trying to install :arch_linux: on this old Chromebook and y'all didn't lie, I don't even have a window manager yet and I've had to pick a font, decide on a network manager, and make many more decisions, all of which were tough without 📶 an IP address... Arch is brutally customizable and I look forward to sharing my setup in a future post...

What got me real distracted, as you'll see coming up 🧵, was setting up a DNS Server 📝 my :arch:📖 should use. Across OSs, in Wi-fi Settings Tabs on phones and Configuration Files Linux there exists the ability to set a DNS Server: 

When that config is in use and a network request is made that includes hostnames like browsing to nerdculture.de or sshing into CromeArch.local; before getting the website content, the network manager will <b>first send the hostname to the IP listed as the DNS Server on port 53</code></b>. The Server will lookup that hostname in a giant table or ask another DNS Server for help using its massive table. In the end you'll get back an IP Address that you computer can use to connect. 

At this point :arch: guides recommend connecting to any random software company's :omya_google: computer that has port 53 open. The first alternative I found was using pi-hole which is perfect, I already have a pi setup to run services in containers. Don't take my word for it, you can read pi-hole's own explanation of why its tough to trust public DNS Servers here:

https://docs.pi-hole.net/guides/dns/unbound/
 
However, I am not going to stop there, recently at work I have been checking out new mobile exploits, so I wanted to try securing my phone's traffic while outside my local network. So I'll also be integrating Tailscale. Tailscale creates an encrypted p2p connection directly from my phone and whatever network its on outside to the pi behind my router. Tailscale provides a static IP for each device you add and they support pretty much every OS where you can install a VPN. Previously I could use this to access the services on my pi i mentioned above outside.

Here's the Setup and Results:

Lets start with the DNS Server: pihole. I love containers for their security and diversity and portability. To make things simpler for now I''l be using podman root containers, but I know it can be hardened later https://b-woody.com/posts/2022-05-12-pihole-on-a-rootless-podman-container/. From the pihole post above I knew I was going to use unbound so i started by combining the compose scripts for pihole https://hub.docker.com/r/pihole/pihole and unbound https://hub.docker.com/r/klutchell/unbound

We don't need to use unbound's redis integration for caching because pihole's FTLDNS "Faster Than Light DNS" includes a caching feature https://docs.pi-hole.net/ftldns/dns-cache/ that will take care of that. 

Moving on will immediately cause issues due to podman's aardvarkdns taking up port 53. To get around this we will map pihole's 53 to a specific ip's port 53 https://github.com/containers/podman/discussions/14242 Additionally in the pihole compose I included the ip address of unbound :5335 which is the port unbound should be configured to use if you followed the unbound link above.

Next I installed tailscale on my pi https://tailscale.com/download and used $ tailscale up --accept-dns=false --advertise-exit-node to start tailscale on the pi. This will allow it to be used as the DNS server and it allows it to act as a VPN for my phone.

On my Pixel 6 I set my Private DNS to Automatic or Off (I couldn't find a difference). Setting the 'Private DNS provider hostname'  didn't work either for any hostname I tried as it doesnt take ips. I set the VPN to 'Always-on VPN' and 'Block connections without VPN'. For WiFi I have Static DHCP with the pi's local and tailscale ipv4 since it only takes ipv4s.

After everything is said and done: