import { defineConfig } from "tsup";

export default defineConfig({
    entry: {
        index: "src/index.ts",
    },
    clean: true,
    format: ["cjs", "esm"],
    dts: true,
    external: ["pino-pretty"],
});
