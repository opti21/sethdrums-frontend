import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import { SWRConfig } from "swr";
import { UserProvider } from "@auth0/nextjs-auth0";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App({ Component, pageProps }: AppProps) {
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
    <UserProvider>
      <SWRConfig
        value={{
          refreshInterval: 5000,
          fetcher,
        }}
      >
        <ToastContainer />
        <ChakraProvider>
          <Component {...pageProps} />
        </ChakraProvider>
      </SWRConfig>
    </UserProvider>
  );
}
