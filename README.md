# PCM Software Manual — 1997 Dodge Viper

A service-manual style reference to the software in the 1997 Viper JTEC
powertrain control module (calibration 04848703AF). Each section describes one
system: what it does, the routines that run it, the instructions and readable
C behind it, and the calibration values it uses. Group 9 covers all 268
calibration structures in the flash image, with an interactive map of the
image. Group 10 has the connector pinouts, the job schedule and an index of
every routine.

Published at https://viperecu.com/.

## Viewing

Open `index.html` locally or serve the folder as a static site. The page has no
runtime dependencies.

## About this repository

The files are generated. Do not edit them here: they are rebuilt from the
source project and replaced on each publish (`.ecu-manual-files.json` lists
them). The original flash image and the complete service manual are not
included. The pages show selected calibration bytes, instruction listings,
recovered C and service-manual figures that the descriptions refer to.
