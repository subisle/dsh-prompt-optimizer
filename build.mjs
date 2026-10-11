/**
 * Self-contained build for dsh-prompt-optimizer:
 * 1. tsc emits lib/types (declarations for the node half and the client face).
 * 2. The hand-written Typert manifests copy to their export paths.
 * 3. esbuild bundles the host lib/index.js (ESM, node platform).
 * 4. esbuild bundles the browser lib/client.js in the DSH closure-factory form:
 *    window.__ModuleLoader__.load({id, factory}) with module-table externals
 *    and a plugin-owned CSS injector for *.module.css imports.
 */
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const ID = 'dsh-prompt-optimizer'

mkdirSync(join(root, 'lib'), { recursive: true })

// 1. Declarations (types face for every export subpath).
execFileSync(process.execPath, [
  join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
  '-p', 'tsconfig.json',
], { stdio: 'inherit' })

// 2. Typert artifacts: copy the hand-written manifests to their export paths.
copyFileSync(join(root, 'src/typert.host.js'), join(root, 'lib/typert.host.js'))
writeFileSync(
  join(root, 'lib/typert.host.d.ts'),
  '/* Hand-written host-face manifest. */\nexport declare const TYPERT: unknown\n',
)
copyFileSync(join(root, 'src/typert.remote-client.js'), join(root, 'lib/typert.remote-client.js'))
writeFileSync(
  join(root, 'lib/typert.remote-client.d.ts'),
  [
    '/* Hand-written client-face contribution. */',
    "import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'",
    'export declare const TYPERT_REMOTE: TypertRemoteContribution',
    'export default TYPERT_REMOTE',
    '',
  ].join('\n'),
)

// 3. Host half.
await build({
  entryPoints: [join(root, 'src/index.ts')],
  outfile: join(root, 'lib/index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2024',
  sourcemap: true,
  packages: 'external',
  logLevel: 'info',
})

// 4. CSS modules compile to a tagged style injector plus a class-map export
// (the DSH factory-execution injection pattern, deterministic local names).
const cssPlugin = {
  name: 'dsh-css-modules',
  setup(build) {
    build.onLoad({ filter: /\.module\.css$/ }, async (args) => {
      const { readFile } = await import('node:fs/promises')
      const css = await readFile(args.path, 'utf8')
      const base = args.path.split('/').pop().replace(/\.module\.css$/, '')
      const map = {}
      const rewritten = css.replace(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g, (match, name) => {
        if (!(name in map)) map[name] = `${base}_${name}`
        return `.${map[name]}`
      })
      const tagId = `${ID}/${base}.module.css`
      const lines = [
        `const css = ${JSON.stringify(rewritten)};`,
        `const tagId = ${JSON.stringify(tagId)};`,
        `if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {`,
        `  const tag = document.createElement('style');`,
        `  tag.dataset.plugin = ${JSON.stringify(ID)};`,
        `  tag.dataset.pluginCss = tagId;`,
        `  tag.textContent = css;`,
        `  document.head.appendChild(tag);`,
        `}`,
        `export default ${JSON.stringify(map)};`,
      ]
      return { contents: lines.join('\n'), loader: 'js' }
    })
  },
}

// 5. Client half in the DSH closure-factory artifact form. The self-remote
// contribution inlines: it is a self-owned generated artifact with no shared
// runtime identity (pure zod schema factories), and inlining avoids a
// cross-package materialization-order dependency.
const client = await build({
  entryPoints: [join(root, 'src/client/index.ts')],
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2024',
  sourcemap: false,
  write: false,
  // Module-table externals: everything requested via dsh.client.inject plus
  // the platform modules. Everything else inlines.
  external: [
    'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client',
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-store',
    '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-client-ui-primitives',
    '@deepseek-ai/dsh-client-ui-dockkit',
    '@deepseek-ai/dsh-api-remotes',
    '@deepseek-ai/dsh-api-session-controller',
    '@deepseek-ai/dsh-client-locale',
    '@deepseek-ai/dsh-client-ui-conversation',
    '@deepseek-ai/dsh-client-ui-chat',
  ],
  alias: {
    '@deepseek-ai/dsh-prompt-optimizer/remote': join(root, 'src/typert.remote-client.js'),
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.MODE': JSON.stringify('production'),
    'import.meta.env': JSON.stringify({ MODE: 'production' }),
  },
  jsx: 'automatic',
  plugins: [cssPlugin],
})

const code = client.outputFiles[0].text
const factory = `window.__ModuleLoader__.load({
	id: ${JSON.stringify(ID)},
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		${code}
		return module.exports;
	}
});
`
writeFileSync(join(root, 'lib/client.js'), factory)

console.log('build: lib/index.js, lib/client.js, typert artifacts written')
