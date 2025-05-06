import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: "'Funnel Display', sans-serif",
    body: "'Funnel Display', sans-serif",
  },
  colors: {
    brand: {
      900: "#1a0025", // very dark purple
      800: "#2d014d", // dark purple
      700: "#3d0066", // accent dark purple
    },
  },
  styles: {
    global: {
      body: {
        bg: "brand.900",
        color: "white",
      },
    },
  },
});

export default theme;
