import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">ICPS AI</div>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/api/auth/signin/auth0">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          AI-Powered Document Processing
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Transform your documents with advanced AI. Upload, chat, and extract insights from your files effortlessly.
        </p>
        <div className="space-x-4">
          <Link href="/api/auth/signin/auth0">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Start Free Trial
            </Button>
          </Link>
          <Button size="lg" variant="outline">
            Learn More
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>AI Document Processing</CardTitle>
              <CardDescription>
                Upload and process documents with advanced AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Extract insights, summarize content, and chat with your documents.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Multiple AI Providers</CardTitle>
              <CardDescription>
                Access to Gemini, OpenAI, and more AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Choose the best AI for your needs with our integrated provider system.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription>
                Your documents are processed securely
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Data isolation and privacy-first approach for all users.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">Simple Pricing</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Free</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">$0</div>
                <ul className="text-left space-y-2">
                  <li>10 file uploads/month</li>
                  <li>20 chat messages/day</li>
                  <li>5 document exports/month</li>
                  <li>Basic AI models</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-2xl text-blue-600">Premium</CardTitle>
                <CardDescription>Unlimited access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">$29<span className="text-lg">/month</span></div>
                <ul className="text-left space-y-2">
                  <li>Unlimited file uploads</li>
                  <li>Unlimited chat messages</li>
                  <li>Unlimited exports</li>
                  <li>Advanced AI models</li>
                  <li>Priority processing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 ICPS AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
