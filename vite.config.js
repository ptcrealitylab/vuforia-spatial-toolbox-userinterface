import { defineConfig } from 'vite';

import { fileURLToPath } from 'node:url';
import {configDefaults} from "vitest/config";

const filesNeedToExclude = ['thirdPartyCode/three/three.module.js'];

const filesPathToExclude = filesNeedToExclude.map((src) => {
  return fileURLToPath(new URL(src, import.meta.url));
});

export default defineConfig({
  plugins: [{
      name: 'transform-add-three-preload',
      transformIndexHtml: {
          enforce: 'post',
          transform(html) {
              return html.replace(
                  '<!-- VITE_PRELOAD_THREE_HERE -->',
                  '<link rel="modulepreload" href="thirdPartyCode/three/three.module.js" />'
              );
          },
      },
  }],
  build: {
    rollupOptions: {
      external: [
        ...filesPathToExclude,
      ],
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "**/thirdPartyCode/**"]
  }
});
