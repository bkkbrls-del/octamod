# Tape Echo testing

## Source evidence

Evidence source: repeat98/octamad commit `b8deefc88b2c3e5f3c6158e364eb741df1924e1d`. Read [the original record](README.md).

The pinned hardware record reports six instances running and a seventh freezing the unit; that limit remains open. Recorded gates cover native arithmetic parity, dirty state, eight-instance stress, moving controls and repeat/feedback behavior. Hardware timing and worst-case CPU headroom remain unqualified.

## Commands and results

Declared native gates:

`tools/verify/verify_tapeecho_cpu.py`

This SDK import did not rerun these gates. CPU-heavy checks remain paused. Historical results are source records, not new qualification of the SDK or a combined configuration. Record exact commands, tested source commit, workload, modes, track count, duration and results here whenever the module changes.

## Hardware and limitations

Hardware status: historical. Eight instances with all controls reversing in BEAT mode. FREE peaked at 18,063. These emulator instruction counts are not hardware cycles or CPU percentages.

Do not claim a passed hardware test without a model, image version, conditions and actual result. Packaging parity is separate from audio quality and hardware safety.
