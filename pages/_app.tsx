import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import { SWRConfig } from "swr";
import { UserProvider } from "@auth0/nextjs-auth0";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <SWRConfig
        value={{
          refreshInterval: 1000,
          fetcher: (resource: any, init: any) =>
            fetch(resource, init).then((res) => res.json()),
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
