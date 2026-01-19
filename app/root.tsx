import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import type { LinksFunction } from "@remix-run/node";
// import DebugSelect from "~/components/DebugSelect";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://cdn.shopify.com" },
];

export default function App() {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider i18n={{}}>
          <Outlet />
          {/* <DebugSelect /> */}
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
