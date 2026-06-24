import type { Metadata } from 'next';
import '@xyflow/react/dist/style.css';
import './globals.css';
import { ChunkErrorRecovery } from './ChunkErrorRecovery';

export const metadata: Metadata = {
  title: 'MOW Demo',
  description: 'Workflow demo interface',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <ChunkErrorRecovery />
        {children}
      </body>
    </html>
  );
}
