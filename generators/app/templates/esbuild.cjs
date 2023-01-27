#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

function getFiles(directory, extension) {
  return fs
    .readdirSync(directory)
    .flatMap(subDirectory => {
      const resolvedPath = path.resolve(directory, subDirectory)
      return fs.statSync(resolvedPath).isDirectory() ? getFiles(resolvedPath, extension) : resolvedPath
    })
    .filter(file => path.extname(file) === extension)
}

const dynamicPrebuiltLoader = {
  name: 'dynamic-prebuilt-loader',
  setup: build => {
    const dynamicPrebuiltLoaderFilter = /^(.*)-prebuilt$/

    build.onResolve({ filter: dynamicPrebuiltLoaderFilter }, async ({ path, resolveDir }) => {
      // Ignore unresolvable paths
      if (resolveDir === '') {
        return
      }

      return {
        path,
        namespace: 'dynamic-prebuilt-loader',
        pluginData: { resolveDir },
      }
    })

    build.onLoad(
      { filter: dynamicPrebuiltLoaderFilter, namespace: 'dynamic-prebuilt-loader' },
      async ({ path, pluginData: { resolveDir } }) => {
        const matches = dynamicPrebuiltLoaderFilter.exec(path)
        const packageName = matches ? matches[1] : 'unknown'

        const requires = getFiles(`node_modules/${packageName}`, '.node')
          .map(req => `require('${req}')`)
          .join(',\n')

        const contents = `
          (function () {
            function loadPrebuild() {
              const fs = require("fs")
              const os = require("os")

              return [${requires}]
                .map(function (binary) {
                  const randomSlug = Math.floor(Math.random()*1000000000000)
                  const nativeLibraryPath = \`\${os.tmpdir()}/${packageName}-\$\{randomSlug\}-native-code.node\`

                  try {
                    fs.writeFileSync(nativeLibraryPath, binary)

                    return require(nativeLibraryPath)
                  }
                  catch { return undefined }
                  finally { fs.unlinkSync(nativeLibraryPath) }
                })
                .find(require => require !== undefined)
            }

            const Module = require('module')
            const originalLoader = Module._load

            Module._load = function(request, parent) {
              // If this is mapbox pre gyp then return
              // an object with a find function that returns
              // a path. Some libraries will do a file existence
              // on this path so we return /dev/null as our
              // sentinel so it will pass that test. When
              // *THAT* is required, we'll just find our
              // loadable prebuild file and return that.
              const MAPBOX_REQUIRE_SENTINEL = '/dev/null'
              if (request === '@mapbox/node-pre-gyp') {
                return { find: () => MAPBOX_REQUIRE_SENTINEL}
              }

              if (request === MAPBOX_REQUIRE_SENTINEL) {
                return loadPrebuild()
              }

              return (request === 'node-gyp-build') ? loadPrebuild : originalLoader.apply(this, arguments)
            }

            require("${packageName}")

            Module._load = originalLoader
          })()
          `

        return { contents, resolveDir }
      }
    )
  },
}

async function build() {
  const esbuild = require('esbuild')

  const result = await esbuild
    .build({
      logLevel: 'info',
      entryPoints: ['src/index.js'],
      bundle: true,
      platform: 'node',
      outfile: 'dist/index.js',
      loader: { '.node': 'binary' },
      external: ['node-gyp-build', '@mapbox/node-pre-gyp'],
      target: ['node8'],
      plugins: [dynamicPrebuiltLoader],
      metafile: true,
      banner: { js: '// NEOCAST Media Plugin' },
    })
    .catch(() => process.exit(1))

  console.log(await esbuild.analyzeMetafile(result.metafile))
}
build()
