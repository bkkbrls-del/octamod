/* Compile the native tool unchanged, exposing its private ELEK composition
 * function to this local byte oracle. Never embed firmware in this source. */
#define main native_eft_cli_main
#include "main.c"
#undef main
int main(int argc, char **argv) {
    if (argc != 5) return 2;
    size_t stock_len = 0, os_len = 0;
    uint8_t *stock = read_file(argv[1], &stock_len), *os = read_file(argv[2], &os_len);
    if (!stock || !os || stock_len < ELEK_SECT_OFF + APLIB_SECT_HDR || os_len == 0 || os_len > (16u << 20) || memcmp(stock,"ELEK",4)) return 3;
    bin_info b = {0}; b.type = CT_ELEK; b.data = stock; b.len = stock_len;
    b.nsections = 1; b.sections[0].id = 3; b.sections[0].offset = ELEK_SECT_OFF;
    b.sections[0].comp_len = APLIB_SECT_HDR + be32(stock + ELEK_SECT_OFF);
    if (ELEK_SECT_OFF + b.sections[0].comp_len > stock_len) return 4;
    override ov = {0}; ov.id = 3; ov.data = os; ov.len = os_len;
    uint8_t *output = calloc(1, os_len * 2 + stock_len + 256);
    if (!output) return 5;
    size_t length = build_elek(&b, output, &ov, 1);
    if (!length || set_version(output, CT_ELEK, argv[3])) return 6;
    FILE *file = fopen(argv[4], "wb");
    if (!file || fwrite(output, 1, length, file) != length || fclose(file)) return 7;
    free(output); free(os); free(stock); return 0;
}
