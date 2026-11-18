import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import { SWRConfig } from "swr";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect } from "react";
import { ColorModeScript } from "@chakra-ui/react";
import theme from "../utils/theme";
import PlausibleProvider from "next-plausible";
import "react-datepicker/dist/react-datepicker.css";
import ReactShortcut from "react-shortcut";
import ReactAudioPlayer from "react-audio-player";
import { useFartModalStore } from "../stateStore/modalState";
import FartModal from "../components/modals/FartModal";

function App({ Component, pageProps }: AppProps) {
  const openFartModal = useFartModalStore((state) => state.open);
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

  return (
    <PlausibleProvider domain="sethdrums.com">
      <UserProvider>
        <SWRConfig
          value={{
            refreshInterval: 5000,
            fetcher,
          }}
        >
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss={false}
            draggable
            pauseOnHover
          />
          <ChakraProvider theme={theme}>
            <ColorModeScript initialColorMode={theme.config.initialColorMode} />
            <ReactShortcut
              keys="Up Up Down Down Left Right Left Right B A"
              onKeysPressed={() => {
                console.log("fart");
                openFartModal();
              }}
            />
            <FartModal />

            <Component {...pageProps} />
          </ChakraProvider>
        </SWRConfig>
      </UserProvider>
    </PlausibleProvider>
  );
}

export default App;
