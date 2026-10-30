'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as z from 'zod';
import {
    Eye,
    EyeOff,
    ArrowUpRight,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Lock,
    Mail,
    Sparkles,
} from 'lucide-react';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';

export default function TestPage() {

    async function clearCache() {
        try {
            const response = await fetch(
                "http://localhost:8080/gateway/cache/clear",
                {
                    method: "DELETE"
                }
            );

            const data = await response.text();

            console.log(data);

        } catch (error) {
            console.error("Cache clearing failed:", error);
        }
    }

    async function testConnection(){
        //start Loadin animation
        try {
            const response = await fetch("http://localhost:8080/goevent/api/test", {
                method: "GET"
            });

            if(response.ok){
                const data = await response.json();
                if(data.status){
                    console.log(data)
                }else{
                    console.log(data.message);
                }
            }else{
                console.log("Request failed! Please try again");
            }
        }catch (e) {
            console.log(e);
        }finally {
            //stop Loadin animation
        }
    }

    async function test() {
        console.log("hi");
    }

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28 relative overflow-hidden">
            {/* Background ambient concert lighting glow */}
            <div className="flex flex-col items-center gap-6 max-w-md w-full bg-[#121216] border border-white/10 rounded-3xl p-8 shadow-2xl">
                <h2 className="font-display text-3xl font-bold uppercase tracking-wider text-center">
                    API & Auth Testing Lab
                </h2>

                <div className="flex flex-wrap justify-center gap-3">
                    <button
                        type="button"
                        onClick={testConnection}
                        className="text-sm bg-white/10 hover:bg-white/20 text-zinc-200 px-6 py-2.5 rounded-full border border-white/10 transition-colors"
                    >
                        Test Backend Connection
                    </button>
                    <button
                        type="button"
                        onClick={clearCache}
                        className="text-sm bg-white/10 hover:bg-white/20 text-zinc-200 px-6 py-2.5 rounded-full border border-white/10 transition-colors"
                    >
                        Clear Gateway Cache
                    </button>
                </div>

                <div className="w-full border-t border-white/10 pt-4 space-y-3">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block text-center">
                        Google OAuth Test
                    </span>
                    <GoogleAuthButton
                        mode="signup"
                        onSuccessCallback={(data) => {
                            console.log("OAuth Success on Test Page:", data);
                            alert("Google OAuth Success! Check browser console for response.");
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
