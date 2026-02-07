"use client";
import React, { useState } from "react";
import { Gift, Mail } from "lucide-react";

export const EmailSignup = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!email) return;
    
    // Simulate API call

      try{
        setMessage("Thank you for subscribing! 🎁");

      }catch(error){}
      setEmail("");
      setIsSubmitting(false);
  };

  return (
    <div className="gift-card rounded-2xl p-8 max-w-6xl mx-auto fade-in-up delay-3 border border-slate-400 font-brasley-medium">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-[#f4f4f4]">
            <Mail className="w-6 h-6 text-black" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Get Early Access
        </h3>
        <p className="text-muted-foreground text-sm">
          Be the first to discover our curated collection of perfect gifts
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pr-4 border-gift-pink/20 focus:border-primary flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            required
          />
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="rounded-md px-4 py-2 cursor-pointer flex items-center justify-center w-full bg-[#121212] text-white border border-[#121212] hover:bg-white hover:text-black transition-all duration-300 hover:scale-105"
        >
          {isSubmitting ? (
            "Subscribing..."
          ) : (
            <>
              <Gift className="w-4 h-4 mr-2" />
              Notify Me
            </>
          )}
        </button>
      </form>
    </div>
  );
};
