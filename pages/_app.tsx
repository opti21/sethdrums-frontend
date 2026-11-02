import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import { SWRConfig, type Middleware } from "swr";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
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

// Auth0 v4's useUser() is a plain useSWR("/auth/profile"), so it inherits
// the global 5s refreshInterval below. Any failed poll (a network blip, a
// Render restart, waking from sleep) makes useUser() return user: null,
// which logs the UI out and tears down the mod/seth Pusher sockets. Load the
// profile once, like the v3 SDK did.
const AUTH_PROFILE_ROUTE = "/auth/profile";

const noAuthProfilePolling: Middleware = (useSWRNext) => (key, fetcher, config) =>
  useSWRNext(
    key,
    fetcher,
    key === AUTH_PROFILE_ROUTE
      ? {
          ...config,
          refreshInterval: 0,
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
        }
      : config
  );

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
      <Auth0Provider>
        <SWRConfig
          value={{
            refreshInterval: 5000,
            fetcher,
            use: [noAuthProfilePolling],
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
      </Auth0Provider>
    </PlausibleProvider>
  );
}

export default App;
