from remix.stock_guard import stock_guard, stock_dsp_words
"""Independent two-core host-port transfer probe; bounded staging only."""
from remix.schema import Category, Detour, DspHook, DspSection, Gate, Kind, Linked, Module, Proof
H=bytes.fromhex
MODULE=Module(
    name='dsp-dynload-transport', key='DSP DYNLOAD TRANSPORT', kind=Kind.HYBRID,
    category=Category.REFERENCE, author='repeat98', author_url='https://github.com/repeat98',
    doc='Experimental two-core DMA mailbox and deferred UI error message; bounded staging without execution.',
    proof=Proof.PORT, proof_note='Both-core DMA and bounded P staging; no effect activation or hardware qualification.',
    linked=(Linked('dltransfer','platform/dsp-dynload-transport/transfer.s',dram=True),
            Linked('dlhooks','platform/dsp-dynload-transport/hooks.s',dram=True),
            Linked('dlselection','platform/dsp-dynload-transport/selection.s',dram=True),
            Linked('dlselectprobe','platform/dsp-dynload-transport/selection_probe.s',dram=True)),
    detours=(Detour(0x4004a8a4, stock_guard(0x4004a8a4, 6, "20577862965e35b56da3cc4660ac5df6a325e455467496552d181b68fff15e2d"),'dlhooks','dl_part_guard',
                    'guard manual Part selection before pattern/shadow linkage writes'),
             Detour(0x400526e4, stock_guard(0x400526e4, 8, "3e7c95b32f444fd280cb96b2a6ea90525fe223d6e6b9352086d2cf41941ae854"),'dlhooks','dl_fx1_guard',
                    'guard FX1 selection before Part, shadow and live writes',pad_to=8),
             Detour(0x40052474, stock_guard(0x40052474, 8, "3e7c95b32f444fd280cb96b2a6ea90525fe223d6e6b9352086d2cf41941ae854"),'dlhooks','dl_fx2_guard',
                    'guard FX2 selection before Part, shadow and live writes',pad_to=8),
             Detour(0x40004bc0, stock_guard(0x40004bc0, 8, "560d267844d7aa23140680beb751fac814290c76527d653fc41fbbb43c830cbf"),'dlhooks','dl_state7',
                   'append two-core packet writes and status reads',pad_to=8),
             Detour(0x4005221e, stock_guard(0x4005221e, 10, "8f0fa4f7d6db857f695996b185b38b788fa6af0eacd86d7dd01e2ff61201ffed"),'dlhooks','dl_tick',
                   'show deferred transport failures from UI task',pad_to=10)),
    dsp=DspSection(asm='platform/dsp-dynload-transport/receiver.asm',priority=0, ptable=(0,)*128,
        payloads=frozenset({'A'}),
        hooks=(DspHook(0x8e, stock_dsp_words("A", 0x8e, 2, "4b7f184ccaa738d94cde6c016bcdd506fe4c68f083af2b163fc8363cc0436648"),'frame','frame head: service loader mailbox'),)),
    gates=(Gate('tools/experimental/dsp_dynload/verify_controller.py',remix_arg=False),
           Gate('tools/experimental/dsp_dynload/verify_transfer.py',remix_arg=False,stage='image'),
           Gate('tools/experimental/dsp_dynload/verify_selection.py',remix_arg=False,stage='image')),
    requires=('DSP DYNLOAD TRANSPORT B',),
)
