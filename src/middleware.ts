import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  // Al poner una ruta que no existe, Vercel nunca ejecutará este middleware 
  // y por lo tanto ya no dará el error 500
  matcher: ['/ruta-desactivada-por-error-de-vercel'],
}
