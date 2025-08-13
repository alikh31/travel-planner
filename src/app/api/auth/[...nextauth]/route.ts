import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Trust proxy headers when behind Cloudflare Tunnel
if (process.env.TRUST_HOST === 'true') {
  process.env.NEXTAUTH_URL_INTERNAL = process.env.NEXTAUTH_URL_INTERNAL || 'http://localhost:3000'
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }