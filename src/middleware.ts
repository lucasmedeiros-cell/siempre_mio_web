import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Desactivamos temporalmente el chequeo de sesión de Supabase aquí 
  // para evitar el error de Edge Runtime (__dirname is not defined) en Vercel.
  // La sesión se manejará desde el cliente.
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
