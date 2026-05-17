import type { Metadata } from 'next';
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import '@/styles/globals.css';

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RentalTrust',
  description: 'Rental application management — no email chasing.',
};

// Runs before React hydration to apply stored theme and prevent flash
const themeInitScript = `(function(){var t=localStorage.getItem('theme');if(t){document.documentElement.dataset.theme=t;}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.dataset.theme='dark';}})();`;

const RootLayout = ({ children }: { readonly children: React.ReactNode }) => (
  <html
    lang="en"
    className={`${instrumentSerif.variable} ${interTight.variable} ${jetbrainsMono.variable} bg-[var(--bg-1)]`}
  >
    <head>
      {/* Theme init must run synchronously before paint */}
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
    </head>
    <body className="min-h-screen flex flex-col">
      {/* Animated liquid background — fixed behind all content */}
      <div className="liquid-bg" aria-hidden="true">
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
        <span className="blob blob-d" />
        <span className="blob blob-e" />
        <div className="grain" />
      </div>

      {/* SVG filter defs for liquid refraction effect (TEN-80) */}
      <svg
        className="liquid-defs"
        aria-hidden="true"
        focusable="false"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      >
        <defs>
          <filter id="liquid-refract" x="-12%" y="-12%" width="124%" height="124%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.022"
              numOctaves={2}
              seed={7}
              result="turb"
            >
              <animate
                attributeName="baseFrequency"
                dur="22s"
                values="0.012 0.022;0.020 0.014;0.012 0.022"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="turb"
              scale={18}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="liquid-refract-soft" x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.018 0.03"
              numOctaves={2}
              seed={3}
              result="turb"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="turb"
              scale={9}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </body>
  </html>
);

export default RootLayout;
