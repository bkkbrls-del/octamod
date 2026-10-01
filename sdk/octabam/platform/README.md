# Shared SDK infrastructure

The two stock-loader declarations and their shared controller source live here,
outside the public module catalog. They are required by the seven initial
modules' native composition, not additional installable contributions.

Sources retain octabam's MIT licence and attribution. Displaced instruction
guards carry addresses, lengths and hashes. The receiver reserves nine words
that the build fills from the developer's own verified stock extraction; the
stock routine is not copied into this source tree. Firmware-dependent source
builds and outputs remain local and ignored. No hardware qualification is
implied by packing or byte-parity results.
