import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// La app se publica en https://<usuario>.github.io/ftr-crm-v2/
export default defineConfig({
  base: "/ftr-crm-v2/",
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
