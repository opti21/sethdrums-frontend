import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import { SWRConfig } from "swr";
import { UserProvider } from "@auth0/nextjs-auth0";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App({ Component, pageProps }: AppProps) {
  const config = {
    clientKey: process.env.NEXT_PUBLIC_PUSHER_KEY,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    triggerEndpoint: "/api/trigger",
  };
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
