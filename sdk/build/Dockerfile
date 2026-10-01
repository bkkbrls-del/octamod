# Toolchain preparation has network access. The module compilation run does not.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends python3 git cmake make g++ binutils-m68k-linux-gnu ca-certificates && rm -rf /var/lib/apt/lists/*
RUN for tool in as ld nm objcopy; do ln -s /usr/bin/m68k-linux-gnu-$tool /usr/local/bin/m68k-elf-$tool; done
WORKDIR /opt/toolchain
COPY sdk/octabam/scripts/vendor.sh scripts/vendor.sh
COPY sdk/octabam/tools/patches/dsp56300.patch tools/patches/dsp56300.patch
COPY sdk/octabam/tools/harness/dsp_host/ tools/harness/dsp_host/
RUN bash scripts/vendor.sh dsp56300 && cmake -S vendor/dsp56300 -B vendor/dsp56300/build -DCMAKE_BUILD_TYPE=Release -DDSP56300_DEBUGGER=OFF && cmake --build vendor/dsp56300/build --target dsp_asm dsp56kDisassemble --parallel 2
RUN /usr/local/bin/m68k-elf-as --version && git -C vendor/dsp56300 rev-parse HEAD
WORKDIR /source
# Runtime always overrides these mounts with clean source and an empty output.
CMD ["python3","-B","scripts/build-module-packages.py","--vendor","/opt/toolchain/vendor","--output","/output/packages"]
