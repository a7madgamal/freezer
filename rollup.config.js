import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
const config = [
  {
    input: "build/ts/freezer.js",
    output: {
      file: "build/freezer.js",
      format: "cjs",
      sourcemap: true,
    },
    external: [],
    plugins: [typescript()],
  },
  {
    input: "build/ts/freezer.d.ts",
    output: {
      file: "build/freezer.d.ts",
      format: "es",
    },
    plugins: [dts()],
  },
];
export default config;
