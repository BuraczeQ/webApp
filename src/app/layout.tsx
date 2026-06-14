import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'webOnline',
  description: 'Your personal productivity app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
