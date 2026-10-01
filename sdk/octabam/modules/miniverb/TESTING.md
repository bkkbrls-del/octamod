# Mini Verb testing

## Source evidence

Evidence source: repeat98/octamad commit `b8deefc88b2c3e5f3c6158e364eb741df1924e1d`. Read [the original record](README.md).

The documented sweep exercises moving controls, trigger splits and eight instances for 4,096 blocks per case. The README explicitly says it has not been flashed or verified on hardware.

## Commands and results

Declared native gates:

`tools/verify/verify_miniverb.py`

This SDK import did not rerun these gates. CPU-heavy checks remain paused. Historical results are source records, not new qualification of the SDK or a combined configuration. Record exact commands, tested source commit, workload, modes, track count, duration and results here whenever the module changes.

## Hardware and limitations

Hardware status: untested. Worst tested case with eight instances, four per core, at 44.1 kHz and 16-sample blocks. Excludes dispatcher, voice engines, other effects and hardware stalls.

Do not claim a passed hardware test without a model, image version, conditions and actual result. Packaging parity is separate from audio quality and hardware safety.
