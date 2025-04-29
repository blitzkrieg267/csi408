"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion'; // For animations

// Simple classname utility (replace '@/lib/utils')
const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

const Home = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleStart = () => setLoading(true);
        const handleComplete = () => setLoading(false);

        if (router.events) {
            router.events.on("routeChangeStart", handleStart);
            router.events.on("routeChangeComplete", handleComplete);
            router.events.on("routeChangeError", handleComplete);

            return () => {
                router.events.off("routeChangeStart", handleStart);
                router.events.off("routeChangeComplete", handleComplete);
                router.events.off("routeChangeError", handleComplete);
            };
        }
    }, [router]);

    const handleNavigation = (href: string) => {
        setLoading(true);
        router.push(href);
    };

    // Animation variants for the text
    const textVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 1.5,
                ease: "easeInOut",
                repeat: Infinity,       // Repeat the animation
                repeatType: "reverse", // Make it go back and forth
            },
        },
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1, transition: { duration: 0.8 } },
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center py-20">
            {loading && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center transition-opacity duration-300">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-opacity-75"></div>
                </div>
            )}

            <div className="container mx-auto text-center relative z-10 space-y-8">
                {/* Animated Title */}
                <motion.h1
                    variants={textVariants}
                    initial="hidden"
                    animate="visible"
                    className="text-6xl sm:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 tracking-tight"
                >
                    Freelance Marketplace
                </motion.h1>

                <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
                    {/* Platform Description */}
                    Connect with talented freelancers or find the perfect
                    opportunities for your skills.  This platform is designed to
                    facilitate connections between two primary user types:
                    <br /><br />
                    -  **Providers:** These are skilled individuals offering their
                    services in various fields.  Providers can create profiles
                    showcasing their expertise, bid on jobs posted by seekers, and
                    ultimately deliver services to complete those jobs.
                    <br /><br />
                    -  **Seekers:** These are individuals or businesses that need
                    specific tasks or projects completed.  Seekers can post job
                    listings detailing their requirements, review bids from
                    providers, select a provider, and manage the job through to
                    completion.
                    <br /><br />
                    The platform's core functionality revolves around job postings,
                    provider bidding, and job management.  Key features include:
                    <br /><br />
                    - Job posting and discovery
                    - Provider profiles
                    - Bid management
                    - Direct communication between seekers and providers
                    - Tools to facilitate job completion.
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button
                        onClick={() => handleNavigation("/provider/signin")}
                        className={cn(
                            "px-8 py-3 text-lg font-semibold rounded-full",
                            "bg-gradient-to-r from-blue-500 to-purple-500",
                            "text-white hover:from-blue-600 hover:to-purple-600",
                            "transition-all duration-300 shadow-lg hover:shadow-xl"
                        )}
                    >
                        Sign In as Provider
                    </button>
                    <button
                        onClick={() => handleNavigation("/sign-in")}
                        className={cn(
                            "px-8 py-3 text-lg font-semibold rounded-full",
                            "bg-gradient-to-r from-pink-500 to-red-500",
                            "text-white hover:from-pink-600 hover:to-red-600",
                            "transition-all duration-300 shadow-lg hover:shadow-xl"
                        )}
                    >
                        Sign In as Seeker
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-lg mx-auto">
                    <button
                        onClick={() => handleNavigation("/sign-up")}
                        className={cn(
                            "flex-1 px-6 py-3 text-lg font-semibold rounded-full",
                            "bg-gradient-to-r from-green-500 to-teal-500",
                            "text-white hover:from-green-600 hover:to-teal-600",
                            "transition-all duration-300 shadow-md hover:shadow-lg"
                        )}
                    >
                        Register
                    </button>
                    
                </div>

                <footer className="mt-16 text-center text-gray-400">
                    <p className="text-sm">
                        Powered by Next.js and ❤️
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Home;
