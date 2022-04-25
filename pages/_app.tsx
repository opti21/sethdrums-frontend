import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import { SWRConfig } from "swr";
import { UserProvider } from "@auth0/nextjs-auth0";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { GrowthBook, GrowthBookProvider } from "@growthbook/growthbook-react";
import { useEffect } from "react";
import { ColorModeScript } from "@chakra-ui/react";
import theme from "../utils/theme";

const growthbook = new GrowthBook({
  trackingCallback: (experiment, result) => {
    console.log({
      experimentId: experiment.key,
      variationId: result.variationId,
    });
  },
});

function App({ Component, pageProps }: AppProps) {
  const fetcher = async (url) => {
    const res = await fetch(url);

    // If the status code is not in the range 200-299,
    // we still try to parse and throw it.
    if (!res.ok) {
      const error = new Error("An error occurred while fetching the data.");
      // Attach extra info to the error object.
      //@ts-ignore
      error.info = await res.json();
      //@ts-ignore
      error.status = res.status;
      throw error;
    }

    return res.json();
  };

  useEffect(() => {
    // Load feature definitions from API
    fetch(process.env.NEXT_PUBLIC_GROWTHBOOK_ENDPOINT)
      .then((res) => res.json())
      .then((json) => {
        growthbook.setFeatures(json.features);
      });
  }, []);

  return (
    <UserProvider>
      <SWRConfig
        value={{
          refreshInterval: 5000,
          fetcher,
        }}
      >
        <ToastContainer />
        <GrowthBookProvider growthbook={growthbook}>
          <ChakraProvider>
            <ColorModeScript initialColorMode={theme.config.initialColorMode} />

            <Component {...pageProps} />
          </ChakraProvider>
        </GrowthBookProvider>
      </SWRConfig>
    </UserProvider>
  );
}

export default App;
