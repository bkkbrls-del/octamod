from remix.stock_guard import stock_guard, stock_dsp_words
from dataclasses import replace
from pathlib import Path
import runpy
from remix.schema import Detour,DspHook,DspSection,Gate,Linked
from experimental.dsp_dynload.runtime_catalog import include
base=runpy.run_path(str(Path(__file__).parent.parent/'dsp-dynload-transport/manifest.py'))['MODULE']
MODULE=replace(base,name='dsp-dynload',key='DSP DYNLOAD',
    doc='Experimental firmware P residency manager, verified uploads and stock dispatch binding.',
    proof_note='Emulator qualification only; static fallback code remains resident.',
    dsp=DspSection(asm='platform/dsp-dynload-transport/receiver_runtime.asm',priority=0,
        ptable=(0,)*1408,defines=(('DLWORDS',1408),),payloads=frozenset({'A'}),
        hooks=(DspHook(0x8e, stock_dsp_words("A", 0x8e, 2, "4b7f184ccaa738d94cde6c016bcdd506fe4c68f083af2b163fc8363cc0436648"),'frame','runtime P transfer and dispatch binding'),)),
    linked=base.linked[:-1]+(
        Linked('dlallocator','platform/dsp-dynload-transport/allocator.s',dram=True),
        Linked('dlpublication','platform/dsp-dynload-transport/publication.s',dram=True),
        Linked('dlpublishhooks','platform/dsp-dynload-transport/publication_hooks.s',dram=True),
        Linked('dlpreflight','platform/dsp-dynload-transport/preflight.s',dram=True),
        Linked('dlbuffers','platform/dsp-dynload-transport/buffers.s',dram=True),
        Linked('dlmanager','platform/dsp-dynload-transport/manager.s',dram=True),
        Linked('dlcatalog','platform/dsp-dynload-transport/catalog.s',dram=True,include=include)),
    detours=base.detours+(
        Detour(0x400a0570, stock_guard(0x400a0570, 8, "7357d174dda33b71e4d29ed8e6d02a3b96a76167a0a44ebe35f2a439406880f4"),'dlpublishhooks','dl_pattern_post','prepare stopped pattern requests before immediate publication',pad_to=8),
        Detour(0x40023c7c, stock_guard(0x40023c7c, 6, "20577862965e35b56da3cc4660ac5df6a325e455467496552d181b68fff15e2d"),'dlpublishhooks','dl_project_post','prepare project before posting its load command'),
        Detour(0x40085336, stock_guard(0x40085336, 8, "ad3ae9d945e9a8a5d22b4fa300de5342486e2c66e7285ca09a0c31f68bb7c667"),'dlpublishhooks','dl_project_engine','refuse unprepared project before any loader side effect',pad_to=8),
        Detour(0x4008540e, stock_guard(0x4008540e, 6, "c607734f7f97b4a13e2047f38d5e2feace1aa3018ec9f19742f612139e7ac0bd"),'dlpublishhooks','dl_project_end','acknowledge completed project publication'),
        Detour(0x400a11ba, stock_guard(0x400a11ba, 6, "0a406353eaf9b91aaa83f81bdc650c191200fb295649c905e7557d89057cb419"),'dlpublishhooks','dl_chain_stop','admit a chain restart before STOP stores its first pattern'),
        Detour(0x40029a4c, stock_guard(0x40029a4c, 8, "ba7573adceae0b4d98e7fca043628b41525f9bf3ec50663e051c89a57a79cb35"),'dlpublishhooks','dl_paste_guard','prepare a pasted active Part before it is written and applied',pad_to=8),
        Detour(0x4004aab4, stock_guard(0x4004aab4, 8, "b135c3d26b1fe44c606ada1d8c7b28ee8977c8b535504950904bcaa790480122"),'dlpublishhooks','dl_reload_guard','prepare a reloaded active Part before it is written and applied',pad_to=8),
        Detour(0x4004a9d0, stock_guard(0x4004a9d0, 8, "9b78b6778f56449ca9429e734d2140df96316ae0e9eea0b9d6eea089f82ddbd0"),'dlpublishhooks','dl_reset_guard','check a reset active Part before it is written and applied',pad_to=8),
        Detour(0x400a406e, stock_guard(0x400a406e, 6, "069bd05051e61e6fa3c670e5183985653fc4c110b8eb3fa2b5765989e0b49c8b"),'dlpublishhooks','dl_boundary_a','admit stop/next pattern before publication'),
        Detour(0x400a44a0, stock_guard(0x400a44a0, 6, "069bd05051e61e6fa3c670e5183985653fc4c110b8eb3fa2b5765989e0b49c8b"),'dlpublishhooks','dl_boundary_b','admit queued pattern before publication')),
    requires=('DSP DYNLOAD B',),gates=(
        Gate('tools/experimental/dsp_dynload/verify_controller.py',remix_arg=False),
        Gate('tools/experimental/dsp_dynload/verify_runtime_audio.py',remix_arg=False,stage='image'),
        Gate('tools/experimental/dsp_dynload/verify_runtime.py',remix_arg=False,stage='image'),
        Gate('tools/experimental/dsp_dynload/verify_publication_guards.py',remix_arg=False,stage='image'),
        Gate('tools/experimental/dsp_dynload/verify_pattern_refusal.py',remix_arg=False,stage='image'),
        Gate('tools/experimental/dsp_dynload/verify_chain_stop.py',remix_arg=False,stage='image'),
        Gate('tools/experimental/dsp_dynload/verify_part_edits.py',remix_arg=False,stage='image'),
        Gate('tools/experimental/dsp_dynload/verify_bypass.py',remix_arg=False,stage='image'),
        Gate('tools/experimental/dsp_dynload/verify_project_publication.py',remix_arg=False,stage='image'),
        Gate('tools/experimental/dsp_dynload/verify_live_audio.py',remix_arg=False,stage='image'),
        Gate('tools/experimental/dsp_dynload/verify_pattern_audio.py',remix_arg=False,stage='image')))
