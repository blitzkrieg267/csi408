"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Optional: Customize the placement of social login buttons
  const socialButtonsPlacement = searchParams.get("socialButtonsPlacement") || "auto";

  return (
    <div style={{ display: "flex", flexDirection: 'column', alignItems: "center", paddingTop: "2rem" }}>
      <button
        onClick={() => router.push("/")}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1.25rem',
          fontWeight: 'bold',
          borderRadius: '0.5rem',
          backgroundColor: '#4F46E5',  // Tailwind indigo-600
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          transition: 'background-color 0.3s ease, transform 0.2s ease',
          marginBottom: '2rem',       // Add space below the button
          width: '100%',            // Make it take full width
          maxWidth: '400px',         // But set a max width
          textAlign: 'center',
          border: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#6366F1';  // Tailwind indigo-700 on hover
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#4F46E5';  // Tailwind indigo-600
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        RETURN HOME
      </button>

      <SignUp
        appearance={{ elements: { card: { boxShadow: "0 0 10px rgba(0,0,0,0.1)" } } }}
        redirectUrl="/selectType"
        socialButtonsPlacement={socialButtonsPlacement as "auto" | "top" | "bottom"}
      />
    </div>
  );
}
