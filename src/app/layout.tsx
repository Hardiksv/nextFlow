import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import LinkedInAttribution from "../components/LinkedInAttribution";

export const metadata = {
  title: "NextFlow Workspace Clone",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        style={{
          width: "100%",
          height: "100%",
          margin: 0,
          padding: 0,
        }}
      >
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>

        <body
          style={{
            width: "100%",
            height: "100%",
            margin: 0,
            padding: 0,
            backgroundColor: "#f1f5f9",
          }}
        >
          <LinkedInAttribution />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
