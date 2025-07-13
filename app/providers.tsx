'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';


export function Providers({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  // Handle Clerk navigation
  const handleNavigation = (to: string) => {
    return router.push(to);
  };
  
  const handleReplace = (to: string) => {
    return router.replace(to);
  };

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''}
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
        elements: {
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
          footerActionLink: 'text-blue-600 hover:text-blue-800',
        },
      }}
      localization={{
        formFieldLabel__emailAddress: 'Email',
        formFieldLabel__password: 'Password',
        formFieldLabel__username: 'Username',
      }}
      afterSignInUrl="/"
      afterSignUpUrl="/"
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      routerPush={handleNavigation}
      routerReplace={handleReplace}
      routerDebug={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ClerkProvider>
  );
}
