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
            <button
                type="button"
                onClick={testConnection}
                className="text-[21px] bg-white/10 hover:bg-white/20 text-zinc-200 px-8 py-3 rounded-full border border-white/10 transition-colors"
            >
                Test
            </button>
            <button
                type="button"
                onClick={clearCache}
                className="text-[21px] bg-white/10 hover:bg-white/20 text-zinc-200 px-8 py-3 rounded-full border border-white/10 transition-colors"
            >
                Clear Chache
            </button>
        </div>
    );
}
