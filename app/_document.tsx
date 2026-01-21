import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Experience premium betting with bet2star. Play number matching, word games, or bet on football matches. Join thousands of winners today." />
        <meta name="author" content="bet2star" />

        <meta property="og:title" content="bet2star - Premium Betting Platform" />
        <meta property="og:description" content="Experience premium betting with bet2star. Play number matching, word games, or bet on football matches." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@bet2star" />
        <meta name="twitter:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
