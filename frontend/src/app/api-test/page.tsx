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


    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28 relative overflow-hidden">
            {/* Background ambient concert lighting glow */}
            <button
                type="button"
                onClick={() => console.log("hi")}
                className="text-[21px] bg-white/10 hover:bg-white/20 text-zinc-200 px-8 py-3 rounded-full border border-white/10 transition-colors"
            >
                Test
            </button>
        </div>
    );
}
