import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fondo: "#EBEEF3",
        papel: "#FFFFFF",
        tinta: "#151B2E",
        suave: "#5B6478",
        linea: "#D5DAE3",
        maiz: "#F2B705",
        espera: "#7C8799",
        confirmado: "#3866DB",
        pagado: "#0E9AA7",
        retirado: "#2A9456",
        deuda: "#D9482F",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', "system-ui", "sans-serif"],
        sans: ['"Hanken Grotesk Variable"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        ficha: "0 1px 0 rgba(21,27,46,0.06), 0 0 0 1px rgba(21,27,46,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
