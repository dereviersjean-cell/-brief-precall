"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// The only client component on the landing page — isolated here so the rest
// stays server-rendered. The scroll listener drives just the shadow toggle.
export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 8);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? "shadow-sm" : ""}`}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">B</span>
          </div>
          <span className="font-semibold text-gray-900 text-lg">Brief</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#fonctionnalites" className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200">
            Fonctionnalités
          </a>
          <a href="#integrations" className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200">
            Intégrations
          </a>
          <a href="#comment-ca-marche" className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200">
            Comment ça marche
          </a>
        </div>

        <Link
          href="/login"
          className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors duration-200"
        >
          Se connecter
        </Link>
      </nav>
    </header>
  );
}
