import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
}


export const theme = extendTheme({
  config,
  components: {
    Button: {
      baseStyle: {
        borderRadius: 0,
      }
    }
  },
  styles: {
    global: (props: any) => ({
      body: {
        fontFamily: 'mono',
        background:
          "linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.15) 100%), radial-gradient(at top center, rgba(255, 255, 255, 0.40) 0%, rgba(0, 0, 0, 0.40) 120%) #989898",
        backgroundBlendMode: "multiply, multiply",
      },
    }),
  },
});
