import './globals.css'

export const metadata = {
  title: 'Meal | mifan.im',
  description: 'Daily meal suggestions powered by backend API',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
