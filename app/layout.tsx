import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PsyAI — Know Yourself. Really.',
  description: 'The world\'s most accurate behavioral assessment. 70 questions. A report that tells you something you have never been told before.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'DM Sans', sans-serif", background: '#0D0F14', color: '#F5F2EC', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
