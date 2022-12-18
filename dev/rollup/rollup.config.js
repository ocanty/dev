// import { terser } from 'rollup-plugin-terser'
// plugin-node-resolve and plugin-commonjs are required for a rollup bundled project
// to resolve dependencies from node_modules. See the documentation for these plugins
// for more details.
import commonjs from '@rollup/plugin-commonjs'
import json from "@rollup/plugin-json"
import { nodeResolve } from '@rollup/plugin-node-resolve'
import ts from 'rollup-plugin-ts'

export default [
  {
    input: './index.ts',
    output: {
      dir: './dist',
      format: 'esm',
      sourcemap: true
    },
    watch: {
      clearScreen: false
    },
    plugins: [ts(), json(), commonjs(), nodeResolve()]
  }
]
