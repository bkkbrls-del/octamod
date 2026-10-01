import sys,pathlib,tempfile,subprocess,json,argparse,os
parser=argparse.ArgumentParser(description="Generate synthetic ColdFire ELF relocation oracles; no stock firmware is read.")
parser.add_argument('worktree',type=pathlib.Path);parser.add_argument('destination',type=pathlib.Path)
args=parser.parse_args();root=args.worktree.resolve();destination=args.destination.resolve()
app=pathlib.Path(__file__).resolve().parents[1]
revision=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
expected=json.loads((app/'src/catalog/native-metadata.json').read_text())['revision']
if revision!=expected:parser.error('Use the catalog-pinned native worktree.')
if subprocess.run(['git','-C',str(root),'diff','--quiet','HEAD']).returncode:parser.error('Native tracked sources must be clean.')
os.chdir(root);sys.path[:0]=[str(root/'tools/build'),str(root/'tools')]
import toolpath
from remix.platform_build import _run,_nm
source='''
.text
.balign 4
.globl entry
entry:
.long data + 2
.long external + 4
.long near - .
.short near - .
.byte near - .
.byte 0
.long target - .
.short target - .
target:
.long 0x12345678
.globl absolute
.equ absolute,0x1234
.weak absent
.long absent
.rodata
.balign 4
.globl constant
constant: .long 0xabcdef12
.data
.balign 8
.globl data
data: .byte 1,2,3,4,5,6,7,8
.bss
.balign 4
.globl scratch
scratch: .space 12
'''
# GNU as spells read-only data as a section directive.
source=source.replace('.rodata\n','.section .rodata\n')
cases=[]
for base in [0x1000,0x40a955e0]:
 with tempfile.TemporaryDirectory(prefix='octamod-cf-fixture.') as tmp:
  w=pathlib.Path(tmp);(w/'source.s').write_text(source)
  _run(['m68k-elf-as','-mcpu=54455','-o','source.o','source.s'],w)
  external=base+0x4000;near=base+0x20
  placements={'.text':base,'.rodata':base+0x1000,'.data':base+0x2000,'.bss':base+0x3000}
  (w/'layout.ld').write_text('SECTIONS { '+ ' '.join(f'{name} 0x{address:x} : {{ *({name}) }}' for name,address in placements.items())+' }')
  _run(['m68k-elf-ld','-T','layout.ld','--entry=entry',f'--defsym=external=0x{external:x}',f'--defsym=near=0x{near:x}','-o','result.elf','source.o'],w)
  linked=[]
  for name in ['.text','.rodata','.data']:
   out=w/(name[1:]+'.bin');_run(['m68k-elf-objcopy','-O','binary',f'--only-section={name}','result.elf',out],w)
   b=out.read_bytes();linked.append({'name':name,'bytes':b.hex()})
  sym=_nm(w/'result.elf',w)
  cases.append({'base':base,'object':(w/'source.o').read_bytes().hex(),'external':{'external':external,'near':near},'placements':placements,'sections':linked,'exports':{n:sym[n] for n in ['entry','absolute','constant','data','scratch']}})
destination.write_text(json.dumps({'schema':1,'source':source,'cases':cases},indent=2)+'\n')
print('Two synthetic native linker fixtures generated; no firmware used.')
