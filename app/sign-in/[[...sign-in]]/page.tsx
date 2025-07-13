import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Aligna</h2>
          <p className="text-gray-600 mb-8">Sign in to save your Figma tokens and analysis history</p>
        </div>
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg sm:px-10">
          <SignIn 
            appearance={{
              elements: {
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
                card: 'shadow-none border-none',
                rootBox: 'w-full',
                formFieldInput: 'w-full',
              }
            }}
          />
        </div>
      </div>
    </div>
  )
} 