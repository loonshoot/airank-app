import { useEffect, useState } from 'react';
import Router, { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import ReactGA from 'react-ga';
import TopBarProgress from 'react-topbar-progress-indicator';
import { SWRConfig } from 'swr';
import i18n from "i18next";
import { useTranslation, initReactI18next } from "react-i18next";
import { Fira_Code } from 'next/font/google'
import progressBarConfig from '@/config/progress-bar/index';
import swrConfig from '@/config/swr/index';
import WorkspaceProvider from '@/providers/workspace';
import { ApolloProvider } from '@apollo/client'
import { useApollo } from '@/lib/client/apollo'

const fira = Fira_Code({ 
  subsets: ['latin'],
  display: 'swap' 
})

import '@/styles/globals.css';
let rawdata = require('../messages/en.json');

let langCode = "en"
let langObject = {}
langObject[langCode] = {}

langObject[langCode].translation = rawdata
i18n
  .use(initReactI18next)
  .init({
    resources: langObject,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

const App = ({ Component, pageProps }) => {
  const apolloClient = useApollo(pageProps)
  const [progress, setProgress] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();
  const swrOptions = swrConfig();

  Router.events.on('routeChangeStart', () => setProgress(true));
  Router.events.on('routeChangeComplete', () => setProgress(false));
  TopBarProgress.config(progressBarConfig());

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      ReactGA.initialize(process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID);
    }
  }, []);

  useEffect(() => {
    const handleRouteChange = (url) => {
      ReactGA.pageview(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
    <SessionProvider session={pageProps.session}>
        <style jsx global>{`
          html {
            font-family: ${fira.style.fontFamily};
          }
        `}</style>
        <SWRConfig value={swrOptions}>
          <ThemeProvider attribute="class">
            <WorkspaceProvider>
              <ApolloProvider client={apolloClient}>
              {progress && <TopBarProgress />}
              <Component {...pageProps} />
              </ApolloProvider>
            </WorkspaceProvider>
          </ThemeProvider>
        </SWRConfig>
    </SessionProvider>
  );
};

export default App;
