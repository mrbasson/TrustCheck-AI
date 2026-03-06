'use client';

import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="bg-indigo-950 text-white py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-6"
        >
          <div className="bg-indigo-900/50 p-4 rounded-full border border-indigo-800">
            <ShieldCheck className="w-12 h-12 text-indigo-400" />
          </div>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-display text-4xl md:text-6xl font-bold mb-6 tracking-tight"
        >
          Verify Trust Before You Engage
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-indigo-200 max-w-2xl mx-auto mb-8"
        >
          Upload an image or enter details to run a comprehensive background check. 
          Our AI analyzes web presence and past behavior to calculate a Trust Factor, 
          helping you make informed decisions about your safety.
        </motion.p>
      </div>
    </section>
  );
}
