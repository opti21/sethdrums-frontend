import { extendTheme, type ThemeConfig } from "@chakra-ui/react";
import { mode } from "@chakra-ui/theme-tools";

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
    global: (props: any) => ({
      body: {
        bg: mode("white", "brand.900")(props),
        color: mode("gray.800", "white")(props),
      },
    }),
  },
});

export default theme;
