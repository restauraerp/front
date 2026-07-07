const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src');

// 1. Create Next.js Middleware for Route Guarding
const middlewareContent = `
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');

  // Protect Admin Routes
  if (isAdminRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/register'],
};
`;
fs.writeFileSync(path.join(__dirname, 'src/middleware.ts'), middlewareContent.trim());

// 2. Update API Lib to handle cookies for SSR and Client
const apiLibContent = `
import { cookies } from 'next/headers';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8029/api/v1';

export async function fetchApi(endpoint: string, options: RequestInit = {}, isServer = false) {
  let token = null;

  if (isServer) {
    // In Server Components, get token from cookies
    const cookieStore = await cookies();
    token = cookieStore.get('token')?.value;
  } else {
    // In Client Components, extract token from document.cookie
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
      if (match) token = match[2];
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = \`Bearer \${token}\`;
  }

  const response = await fetch(\`\${API_BASE_URL}\${endpoint}\`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error('API Request Failed');
  }

  if (response.status === 204) return null;
  return response.json();
}
`;
fs.writeFileSync(path.join(__dirname, 'src/lib/api.ts'), apiLibContent.trim());

// 3. Login Page implementation
const loginPageContent = `
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { API_BASE_URL } from '@/lib/api';
import styles from './login.module.css';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(\`\${API_BASE_URL}/auth/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await res.json();
      
      // Save token to cookie (secure in prod)
      document.cookie = \`token=\${data.access_token}; path=/; max-age=86400; SameSite=Lax\`;
      
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <Card title="Staff Login">
        <form onSubmit={handleLogin}>
          <Input 
            label="Email Address" 
            type="email" 
            value={email} 
            onChange={(e: any) => setEmail(e.target.value)} 
            required 
          />
          <Input 
            label="Password" 
            type="password" 
            value={password} 
            onChange={(e: any) => setPassword(e.target.value)} 
            required 
          />
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '1rem' }}>
            Login to Dashboard
          </Button>
        </form>
      </Card>
    </div>
  );
}
`;
fs.writeFileSync(path.join(__dirname, 'src/app/(auth)/login/page.tsx'), loginPageContent.trim());
fs.writeFileSync(path.join(__dirname, 'src/app/(auth)/login/login.module.css'), `
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--background);
  padding: 1rem;
}
.error {
  color: var(--danger);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}
`.trim());

// 4. SEO Metadata globally
const layoutContent = `
import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'RestoraERP | Premium Restaurant Management',
  description: 'Manage your restaurant operations efficiently with RestoraERP. Powerful POS, Inventory, and CRM system tailored for the modern culinary business.',
  keywords: 'Restaurant ERP, POS, Inventory Management, CRM, Booking',
  openGraph: {
    title: 'RestoraERP',
    description: 'The Ultimate Restaurant Management System',
    type: 'website',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
fs.writeFileSync(path.join(__dirname, 'src/app/layout.tsx'), layoutContent.trim());

console.log('Phase 4 & 6 implementations injected successfully.');
