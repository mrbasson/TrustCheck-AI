'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Search, AlertTriangle, CheckCircle, Info, Loader2, X, ShieldCheck } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export function BackgroundCheckForm() {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [details, setDetails] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    trustScore: number;
    analysis: string;
    sources: { uri: string; title: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = reader.result.split(',')[1];
          resolve(base64Data);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name && !phoneNumber && !postUrl && !image) {
      setError('Please provide at least a name, phone number, post URL, or an image to run a check.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      let prompt = `You are a fraud detection and background check assistant. 
      Analyze the provided information to determine a "Trust Factor" score from 0 to 100 
      (where 0 is highly suspicious/fraudulent and 100 is highly trustworthy).
      
      Target Name: ${name || 'Unknown'}
      Phone/WhatsApp Number: ${phoneNumber || 'Not provided'}
      Social Media Post URL: ${postUrl || 'Not provided'}
      Additional Details: ${details || 'None provided'}
      
      Instructions:
      1. Search the web, specifically targeting social media platforms like Facebook, Instagram, and WhatsApp, for this person, entity, or phone number to find any reports of scams, fraud, or suspicious behavior.
      2. If a Social Media Post URL is provided, analyze the post content, the user profile name, and the account's behavior for signs of scams, fake engagement, or fraudulent activity.
      3. If an image is provided, analyze it for signs of manipulation, stock photo usage, or known scammer profiles.
      4. Provide a detailed analysis of your findings, including any social media footprint associated with the name, number, or post.
      5. Conclude with a clear "Trust Factor" score (0-100).
      6. Format your response in Markdown. Start with the score prominently, then the analysis.`;

      const contents: any = [];
      
      if (image) {
        const base64Data = await fileToBase64(image);
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: image.type,
          }
        });
      }
      
      contents.push({ text: prompt });

      // Use gemini-3.1-pro-preview for complex analysis with search grounding
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: { parts: contents },
        config: {
          tools: [{ googleSearch: {} }, { urlContext: {} }],
        }
      });

      const text = response.text || 'No analysis could be generated.';
      
      // Extract sources
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .map((chunk: any) => chunk.web)
        .filter(Boolean)
        .map((web: any) => ({ uri: web.uri, title: web.title }));

      // Try to extract a score from the text (simple regex for 0-100)
      let score = 50; // default
      const scoreMatch = text.match(/(?:Trust Factor|Score)[\s:]*(\d{1,3})/i);
      if (scoreMatch && scoreMatch[1]) {
        score = parseInt(scoreMatch[1], 10);
        score = Math.min(100, Math.max(0, score));
      } else {
        // Fallback heuristic if regex fails
        if (text.toLowerCase().includes('high risk') || text.toLowerCase().includes('scam')) {
          score = 20;
        } else if (text.toLowerCase().includes('trustworthy') || text.toLowerCase().includes('safe')) {
          score = 80;
        }
      }

      setResult({
        trustScore: score,
        analysis: text,
        sources
      });

    } catch (err: any) {
      console.error('Error running check:', err);
      setError(err.message || 'An error occurred while running the background check.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-emerald-50 border-emerald-200';
    if (score >= 40) return 'bg-amber-50 border-amber-200';
    return 'bg-rose-50 border-rose-200';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form Section */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8"
      >
        <h2 className="text-2xl font-display font-semibold mb-6">Enter Details</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Name or Alias
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g. John Doe, @crypto_king99"
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 mb-1">
              Phone / WhatsApp Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g. +1 234 567 8900"
            />
          </div>

          <div>
            <label htmlFor="postUrl" className="block text-sm font-medium text-slate-700 mb-1">
              Social Media Post URL
            </label>
            <input
              type="url"
              id="postUrl"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g. https://www.facebook.com/..."
            />
          </div>

          <div>
            <label htmlFor="details" className="block text-sm font-medium text-slate-700 mb-1">
              Additional Context (Optional)
            </label>
            <textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
              placeholder="Where did you meet them? What are they offering? Any phone numbers or emails?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Upload Image (Optional)
            </label>
            
            {!imagePreview ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-all group"
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3 group-hover:text-indigo-500 transition-colors" />
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP up to 5MB</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-48 object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-4 right-4 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-white text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {error && (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (!name && !phoneNumber && !postUrl && !image)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Analysis...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Run Background Check
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Results Section */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="h-full"
      >
        <AnimatePresence mode="wait">
          {!result && !isSubmitting ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full bg-slate-100 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-8 text-center min-h-[400px]"
            >
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">Awaiting Input</h3>
              <p className="text-slate-500 max-w-sm">
                Enter details or upload an image on the left to generate a comprehensive trust analysis.
              </p>
            </motion.div>
          ) : isSubmitting ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-8 text-center min-h-[400px]"
            >
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                <ShieldCheck className="absolute inset-0 m-auto w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-medium text-slate-800 mb-2">Analyzing Data</h3>
              <p className="text-slate-500 max-w-sm">
                Searching the web, analyzing images, and calculating trust factors...
              </p>
            </motion.div>
          ) : result ? (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full"
            >
              <div className={`p-6 border-b ${getScoreBg(result.trustScore)}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Trust Factor</h3>
                  <div className="flex items-center gap-2">
                    {result.trustScore >= 70 ? (
                      <CheckCircle className={`w-6 h-6 ${getScoreColor(result.trustScore)}`} />
                    ) : result.trustScore >= 40 ? (
                      <Info className={`w-6 h-6 ${getScoreColor(result.trustScore)}`} />
                    ) : (
                      <AlertTriangle className={`w-6 h-6 ${getScoreColor(result.trustScore)}`} />
                    )}
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <span className={`text-6xl font-display font-bold tracking-tighter ${getScoreColor(result.trustScore)}`}>
                    {result.trustScore}
                  </span>
                  <span className="text-slate-600 font-medium mb-2">/ 100</span>
                </div>
                <div className="mt-4 w-full bg-white/50 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      result.trustScore >= 70 ? 'bg-emerald-500' : 
                      result.trustScore >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${result.trustScore}%` }}
                  />
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto prose prose-slate prose-sm max-w-none">
                <ReactMarkdown>{result.analysis}</ReactMarkdown>
              </div>

              {result.sources.length > 0 && (
                <div className="p-6 bg-slate-50 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Sources Found
                  </h4>
                  <ul className="space-y-2">
                    {result.sources.map((source, idx) => (
                      <li key={idx} className="text-sm">
                        <a 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 hover:underline line-clamp-1"
                        >
                          {source.title || source.uri}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
