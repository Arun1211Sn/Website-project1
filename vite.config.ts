import { defineConfig, type Plugin } from 'vite';

// The home page's stylesheet is small (~5 KB gzipped), so it is written into
// index.html at build time instead of being fetched as a render-blocking file.
// On a slow mobile connection that saves a full round trip before first paint.
function inlineCss(): Plugin {
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = Object.values(bundle).find(
        (file) => file.type === 'asset' && file.fileName === 'index.html',
      );
      if (!html || html.type !== 'asset') return;

      let source = String(html.source);
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type !== 'asset' || !name.endsWith('.css')) continue;
        const tag = new RegExp(`<link rel="stylesheet"[^>]*href="/${name}"[^>]*>`);
        if (!tag.test(source)) continue;
        source = source.replace(tag, () => `<style>${String(file.source)}</style>`);
        delete bundle[name];
      }
      html.source = source;
    },
  };
}

export default defineConfig({
  plugins: [inlineCss()],
});
