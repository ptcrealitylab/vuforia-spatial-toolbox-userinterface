// MIT license from Microsoft
#include <stdio.h>
#include <stdlib.h>

#include <emscripten/emscripten.h>

#ifdef __cplusplus
#define EXTERN extern "C"
#else
#define EXTERN
#endif

int *buffer;
int *pBuffer;
int word = 0;
int nibblesWritten = 0;

void encodeVLE(int value) {
  do {
    int nibble = value & 0x7;
    if (value >>= 3) nibble |= 0x8;
    word <<= 4;
    word |= nibble;
    if (++nibblesWritten == 8) {
      *pBuffer++ = word;
      nibblesWritten = 0;
      word = 0;
    }
  } while (value);
}

int decodeVLE() {
  unsigned int nibble;
  int value = 0;
  int bits = 29;
  do {
    if (!nibblesWritten) {
      word = *pBuffer++;
      nibblesWritten = 8;
    }
    nibble = word & 0xf0000000;
    value |= (nibble << 1) >> bits;
    word <<= 4;
    nibblesWritten --;
    bits -= 3;
  } while (nibble & 0x80000000);
  return value;
}

EXTERN EMSCRIPTEN_KEEPALIVE int compressRVL(short* input, char* output, int numPixels) {
  buffer = pBuffer = (int*) output;
  nibblesWritten = 0;
  short *end = input + numPixels;
  short previous = 0;
  while (input != end) {
    int zeros = 0;
    int nonzeros = 0;
    for (; (input != end) && !*input; input++, zeros++) {
    }
    encodeVLE(zeros);
    for (short* p = input; (p != end) && *p++; nonzeros++);
    encodeVLE(nonzeros);
    for (int i = 0; i < nonzeros; i++) {
      short current = *input++;
      int delta = current - previous;
      int positive = (delta << 1) ^ (delta >> 31);
      encodeVLE(positive);
      previous = current;
    }
  }
  if (nibblesWritten) {
    *pBuffer++ = word << 4 * (8 - nibblesWritten);
  }
  return (int)((char*)pBuffer - (char*)buffer);
}

EXTERN EMSCRIPTEN_KEEPALIVE void decompressRVL(char* input, short* output, int numPixels) {
  buffer = pBuffer = (int*)input;
  nibblesWritten = 0;
  short current, previous = 0;
  int numPixelsToDecode = numPixels;
  while (numPixelsToDecode) {
    int zeros = decodeVLE();
    numPixelsToDecode -= zeros;
    for (; zeros; zeros--) {
      *output++ = 0;
    }
    int nonzeros = decodeVLE();
    numPixelsToDecode -= nonzeros;
    for (; nonzeros; nonzeros--) {
      int positive = decodeVLE();
      int delta = (positive >> 1) ^ -(positive & 1);
      current = previous + delta;
      *output++ = current;
      previous = current;
    }
  }
}

int main() {
  int width = 512;
  int height = 512;
  int nPixels = width * height;
  short* buf = (short*)malloc(sizeof(short) * nPixels);
  for (int i = 0; i < nPixels; i++) {
    buf[i] = (short)((i) & 0xfffc);
  }
  char* output = (char*)malloc(sizeof(short) * nPixels * 4);
  int outputLen = compressRVL(buf, output, nPixels);
  short* bufOut = (short*)malloc(sizeof(short) * nPixels);
  decompressRVL(output, bufOut, nPixels);
  for (int i = 0; i < nPixels; i++) {
    if (buf[i] == bufOut[i]) {
      continue;
    }
    printf("%s\n", "failure lol");
  }
  printf("%d %f\n", outputLen, ((float)outputLen) / (2.0 * nPixels));
}
