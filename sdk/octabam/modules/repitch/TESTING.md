# Repitch testing

## Source evidence

Evidence source: repeat98/octamad commit `b8deefc88b2c3e5f3c6158e364eb741df1924e1d`. Read [the original record](README.md).

The README records MKII operation on image OCTABAM81 and emulator checks. MKI, slices and recorder buffers were not measured in that record.

## Commands and results

Declared native gates:

`tools/verify/verify_repitch.py`

This SDK import did not rerun these gates. CPU-heavy checks remain paused. Historical results are source records, not new qualification of the SDK or a combined configuration. Record exact commands, tested source commit, workload, modes, track count, duration and results here whenever the module changes.

## Hardware and limitations

Hardware status: historical. Uses tempo-driven playback speed with timestretch off in the voice renderer. No quantitative load comparison has been published.

Do not claim a passed hardware test without a model, image version, conditions and actual result. Packaging parity is separate from audio quality and hardware safety.
