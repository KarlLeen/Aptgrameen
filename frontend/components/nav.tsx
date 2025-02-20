"use client";

import Link from 'next/link'


export function Nav() {
  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center space-x-4 lg:space-x-6">
          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Overview
          </Link>
          <Link
            href="/hedge"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Hedge
          </Link>
          <Link
            href="/credit"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Credit
          </Link>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <Link href="/ai-interview" className="text-sm font-medium">
            AI Interview
          </Link>
        </div>
      </div>
    </nav>
  )
}
