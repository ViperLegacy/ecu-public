# Viper ECU Field Guide

An interactive guide to the recovered Viper JTEC reference firmware, including
execution walkthroughs, a Flash data atlas, and a map of the complete 256 KiB
image. Findings distinguish observed structure from inferred or unresolved
behavior.

## View the guide

Open `index.html` locally, or serve this repository as a static website.
The page is self-contained and has no runtime dependencies.

## GitHub Pages

Configure **Settings → Pages → Deploy from a branch**, select **main** and
**/ (root)**, then save. The `.nojekyll` marker enables plain static serving.
No build command or dependency installation is required.

This repository contains the hosted guide. The original flash image, complete
service manual, acquisition tools, and working analysis projects are not
included. The guide does embed selected table bytes, recovered C/instructions,
and curated reference evidence needed for its explanations.
