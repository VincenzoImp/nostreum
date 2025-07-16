"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
    ArrowLeftIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    LinkIcon,
    UserPlusIcon,
    InformationCircleIcon
} from "@heroicons/react/24/outline";

/**
 * Profile Fallback Content Component
 * Separated to handle useSearchParams properly
 */
function ProfileFallbackContent() {
    const searchParams = useSearchParams();
    const reason = searchParams.get('reason') || 'not_found';
    const originalInput = searchParams.get('input') || '';

    /**
     * Get appropriate message based on the reason for fallback
     */
    const getFallbackContent = () => {
        switch (reason) {
            case 'no_link':
                return {
                    icon: <LinkIcon className="w-16 h-16 text-warning" />,
                    title: "No Nostr Link Found",
                    description: "This Ethereum address is not linked to any Nostr public key.",
                    details: [
                        "The Ethereum address you searched for exists but has no associated Nostr identity",
                        "The owner needs to create a link using the NostrLinkr contract",
                        "You can try searching with a different identifier"
                    ],
                    suggestions: [
                        {
                            title: "Search with Nostr Pubkey",
                            description: "If you have the user's Nostr public key or npub, search with that instead",
                            action: "Try Different Search"
                        },
                        {
                            title: "Create a Link",
                            description: "If this is your address, you can link it to your Nostr identity",
                            action: "Learn About Linking"
                        }
                    ]
                };

            case 'invalid_pubkey':
                return {
                    icon: <ExclamationTriangleIcon className="w-16 h-16 text-error" />,
                    title: "Invalid Public Key",
                    description: "The public key format is not valid or contains errors.",
                    details: [
                        "Public keys must be 64-character hexadecimal strings",
                        "Npub addresses must start with 'npub' and be 63 characters long",
                        "Ethereum addresses must be valid 42-character addresses starting with '0x'"
                    ],
                    suggestions: [
                        {
                            title: "Check the Format",
                            description: "Verify that your input matches one of the supported formats",
                            action: "View Format Guide"
                        },
                        {
                            title: "Try Again",
                            description: "Double-check your input and search again",
                            action: "Back to Search"
                        }
                    ]
                };

            case 'not_found':
            default:
                return {
                    icon: <MagnifyingGlassIcon className="w-16 h-16 text-info" />,
                    title: "Profile Not Found",
                    description: "We couldn't find a profile with the provided identifier.",
                    details: [
                        "The profile may not exist on the connected Nostr relays",
                        "The user might not have published profile information yet",
                        "There could be a temporary connectivity issue with the relay"
                    ],
                    suggestions: [
                        {
                            title: "Try Different Relays",
                            description: "The profile might exist on other Nostr relays not currently connected",
                            action: "Check Relay Settings"
                        },
                        {
                            title: "Search Again",
                            description: "Verify the identifier and try searching again",
                            action: "Back to Search"
                        },
                        {
                            title: "Create Profile",
                            description: "If this should be your profile, you can create one on Nostr",
                            action: "Learn About Nostr"
                        }
                    ]
                };
        }
    };

    const content = getFallbackContent();

    /**
     * Safe back navigation that handles both browser history and fallback
     */
    const handleGoBack = () => {
        try {
            // Check if there's history to go back to
            if (window.history.length > 1) {
                window.history.back();
            } else {
                // Fallback to profile search if no history
                window.location.href = '/profile';
            }
        } catch (error) {
            // If anything fails, redirect to profile search
            window.location.href = '/profile';
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4">
                <Link href="/profile" className="btn btn-ghost btn-sm">
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Search
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Profile Search</h1>
                </div>
            </div>

            {/* Main Error Card */}
            <div className="card bg-base-100 shadow-lg border-2 border-base-300">
                <div className="card-body items-center text-center p-8">
                    <div className="mb-4">
                        {content.icon}
                    </div>

                    <h2 className="text-2xl font-bold mb-2">{content.title}</h2>
                    <p className="text-base-content/70 mb-6 max-w-md">
                        {content.description}
                    </p>

                    {originalInput && (
                        <div className="bg-base-200 p-3 rounded-lg mb-6 w-full">
                            <p className="text-sm font-medium mb-1">Searched for:</p>
                            <code className="text-sm break-all">{originalInput}</code>
                        </div>
                    )}

                    <div className="flex gap-3 flex-wrap justify-center">
                        <Link href="/profile" className="btn btn-primary">
                            <MagnifyingGlassIcon className="w-4 h-4" />
                            Try New Search
                        </Link>
                        <button
                            className="btn btn-ghost"
                            onClick={handleGoBack}
                            type="button"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Go Back
                        </button>
                    </div>
                </div>
            </div>

            {/* Details Section */}
            <div className="card bg-base-200 shadow-md">
                <div className="card-body p-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <InformationCircleIcon className="w-5 h-5" />
                        What happened?
                    </h3>
                    <ul className="space-y-2">
                        {content.details.map((detail, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className="w-2 h-2 bg-base-content/50 rounded-full mt-2 flex-shrink-0"></span>
                                <span className="text-sm">{detail}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Suggestions */}
            <div className="card bg-base-100 shadow-md">
                <div className="card-body p-6">
                    <h3 className="text-lg font-semibold mb-4">💡 What you can do</h3>
                    <div className="space-y-4">
                        {content.suggestions.map((suggestion, index) => (
                            <div key={index} className="flex items-start gap-4 p-4 bg-base-200 rounded-lg">
                                <div className="flex-1">
                                    <h4 className="font-medium mb-1">{suggestion.title}</h4>
                                    <p className="text-sm text-base-content/70">{suggestion.description}</p>
                                </div>
                                <Link
                                    href="/profile"
                                    className="btn btn-sm btn-ghost"
                                >
                                    {suggestion.action}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Additional Help Section */}
            <div className="text-center py-4 bg-base-200 rounded-xl">
                <h3 className="text-lg font-semibold mb-2">Need more help?</h3>
                <p className="text-sm opacity-80 mb-4">
                    If you're still having trouble finding a profile, try these options:
                </p>
                <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
                    <Link href="/profile" className="flex items-center gap-1 hover:text-primary">
                        <MagnifyingGlassIcon className="w-4 h-4" />
                        Search Again
                    </Link>
                    <Link href="/" className="flex items-center gap-1 hover:text-primary">
                        <ArrowLeftIcon className="w-4 h-4" />
                        Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

/**
 * Profile Fallback Page
 *
 * Displayed when:
 * - A profile doesn't exist
 * - An Ethereum address has no linked Nostr pubkey
 * - Invalid pubkey provided
 * - Any other profile lookup failure
 */
export default function ProfileFallback() {
    return (
        <Suspense fallback={
            <div className="max-w-2xl mx-auto p-4">
                <div className="text-center py-8">
                    <div className="loading loading-spinner loading-lg"></div>
                    <p className="mt-4">Loading...</p>
                </div>
            </div>
        }>
            <ProfileFallbackContent />
        </Suspense>
    );
}