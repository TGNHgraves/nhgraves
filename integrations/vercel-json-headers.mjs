// The Vercel adapter writes its own routing config (.vercel/output/config.json) and doesn't
// carry over the headers in vercel.json, so copy them in after the build. Runs after the
// adapter's own build:done hook (Astro puts the adapter first). Each source is used as a
// plain regex, which is right for "/(.*)" but not for Vercel's :param syntax.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export default function vercelJsonHeaders() {
  let root;
  return {
    name: 'vercel-json-headers',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = config.root;
      },
      'astro:build:done': ({ logger }) => {
        const source = new URL('vercel.json', root);
        const output = new URL('.vercel/output/config.json', root);
        if (!existsSync(source) || !existsSync(output)) return;
        const { headers = [] } = JSON.parse(readFileSync(source, 'utf8'));
        const config = JSON.parse(readFileSync(output, 'utf8'));
        const rules = headers.map(({ source: path, headers: list }) => ({
          src: `^${path}$`,
          headers: Object.fromEntries(list.map(({ key, value }) => [key, value])),
          continue: true,
        }));
        config.routes = [...rules, ...(config.routes || [])];
        writeFileSync(output, JSON.stringify(config, null, 2));
        logger.info(`copied ${rules.length} header rule(s) from vercel.json into the Vercel output`);
      },
    },
  };
}
