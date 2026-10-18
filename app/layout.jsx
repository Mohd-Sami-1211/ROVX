import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://rovx-bhaderwah-26.pink-lynx-7952.chatgpt.site"),
  title: "ROVX–Bhaderwah 26 | Born for the wild. | 13 December 2026",
  description: "The first edition of ROVX hits Bhaderwah on 13 December 2026. Offroad car racing, mountain energy, and two complimentary nights for participants. Presented by bagspackgo in collaboration with BDA.",
  openGraph: { title: "ROVX–Bhaderwah 26", description: "13 December 2026. One valley. Zero limits.", images: ["/media/jeep-eclipse-v2.webp"], type: "website" },
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
