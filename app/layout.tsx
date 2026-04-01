import './globals.css';

export const metadata = {
  title: 'MNQ Order Flow AI Analyst',
  description: 'Análisis IA de Order Flow + GEXBOT',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-zinc-950">{children}</body>
    </html>
  );
}
