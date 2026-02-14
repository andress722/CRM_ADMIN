import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Production-ready admin panel for e-commerce management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
