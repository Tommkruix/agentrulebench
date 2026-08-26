import path from "node:path";

export default {
  test: { environment: "node", include: ["**/route.acceptance.test.ts"] },
  resolve: { alias: [{ find: /^@\//, replacement: `${path.resolve(process.cwd(), "src")}/` }] },
};
