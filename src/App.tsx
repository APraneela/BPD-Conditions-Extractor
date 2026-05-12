import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import copy from 'copy-to-clipboard';
import { 
  FileSpreadsheet, 
  Upload, 
  Search, 
  Copy, 
  CheckCircle2, 
  X,
  FileSearch,
  Filter,
  BrainCircuit,
  Hash
} from 'lucide-react';
import { extractConditions, ConditionEntry, ExtractionResult } from './extractor';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ConditionEntry[]>([]);
  const [stepCount, setStepCount] = useState<number>(0);
  const [allTabs, setAllTabs] = useState<string[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<string>('All');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        setError('Please upload a valid .xlsx file.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setHasExtracted(false);
      setResults([]);
      setStepCount(0);
      setError(null);
    }
  };

  const startExtraction = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const extracted: ExtractionResult = await extractConditions(file);
      setResults(extracted.conditions);
      setStepCount(extracted.stepCount);
      setAllTabs(extracted.sheets);
      setHasExtracted(true);
    } catch (err) {
      console.error(err);
      setError('Failed to process the Excel file. Please ensure it follows the BPD format.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.name.endsWith('.xlsx')) {
        setFile(droppedFile);
        setHasExtracted(false);
        setResults([]);
        setError(null);
      } else {
        setError('Please upload a valid .xlsx file.');
      }
    }
  };

  const getFilteredResults = () => {
    const searchLower = searchQuery.toLowerCase();
    
    if (activeTabFilter === 'All') {
      // Global unique conditions across all tabs (case-insensitive deduplication)
      const uniqueMap = new Map<string, ConditionEntry>();
      
      results.forEach(item => {
        const conditionLower = item.condition.toLowerCase();
        if (!conditionLower.includes(searchLower)) return;
        
        if (!uniqueMap.has(conditionLower)) {
          uniqueMap.set(conditionLower, item);
        }
      });
      
      return Array.from(uniqueMap.values());
    } else {
      // Unique conditions specific to the selected tab
      const tabItems = results.filter(item => 
        item.tab.toLowerCase() === activeTabFilter.toLowerCase() &&
        item.condition.toLowerCase().includes(searchLower)
      );
      
      const uniqueMap = new Map<string, ConditionEntry>();
      tabItems.forEach(item => {
        if (!uniqueMap.has(item.condition)) {
          uniqueMap.set(item.condition, item);
        }
      });
      
      return Array.from(uniqueMap.values());
    }
  };

  const filteredResults = getFilteredResults();

  const copyToClipboard = async () => {
    const text = filteredResults.map(r => r.condition).join('\n');
    
    if (!text) {
      console.warn('No text to copy');
      return;
    }

    try {
      console.log('Attempting to copy:', text.substring(0, 50) + '...');
      // Explicitly await the copy call as it returns a Promise<boolean> in this environment
      const success = await copy(text, {
        debug: true,
        message: 'Press #{key} to copy',
      });

      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('Copy command failed');
      }
    } catch (err) {
      console.error('Copy failed, using manual fallback:', err);
      // Absolute last resort fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (f) {
        console.error('All copy methods failed');
      }
      document.body.removeChild(textArea);
    }
  };

  const clearResults = () => {
    setFile(null);
    setResults([]);
    setStepCount(0);
    setAllTabs([]);
    setHasExtracted(false);
    setError(null);
    setSearchQuery('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-[#E2E8F0]">
      {/* Structural Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
      </div>

      <header className="relative border-b border-[#1A1A1A]/10 bg-white/80 backdrop-blur-md z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded flex items-center justify-center shadow-lg shadow-black/10">
              <BrainCircuit className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">BPD Conditions Extractor</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A]/30 leading-none mt-0.5">Logic Analysis Engine</p>
            </div>
          </div>
          
          {hasExtracted && (
            <button 
              onClick={clearResults}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-[#1A1A1A]/10 rounded hover:bg-[#1A1A1A] hover:text-white transition-all flex items-center gap-2"
            >
              <X size={14} /> New Session
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">
          {!hasExtracted && !loading ? (
            <motion.div 
              key="uploader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div 
                className="group relative border-2 border-dashed rounded-[2.5rem] p-1 text-center transition-all bg-white shadow-2xl shadow-black/[0.04] border-[#1A1A1A]/5 overflow-hidden"
              >
                <div 
                  className={`m-1 border border-dashed rounded-[2.2rem] p-12 transition-all cursor-pointer ${file ? 'bg-[#1A1A1A]/[0.02] border-[#1A1A1A]/20' : 'hover:bg-[#1A1A1A]/[0.01]'}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx"
                    className="hidden"
                  />
                  
                  <div className="flex flex-col items-center gap-8">
                    {file ? (
                      <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-20 h-20 bg-green-50 rounded-3xl border border-green-100 flex items-center justify-center mb-6">
                          <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight mb-2 truncate max-w-sm">{file.name}</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A]/30">File Loaded & Ready</p>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            startExtraction();
                          }}
                          className="mt-8 px-10 py-5 bg-[#1A1A1A] text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
                        >
                          Get Unique Conditions
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-24 h-24 rounded-[2rem] bg-[#1A1A1A]/[0.02] border border-[#1A1A1A]/5 flex items-center justify-center group-hover:rotate-6 transition-transform duration-500">
                          <Upload className="w-10 h-10 text-[#1A1A1A]/40" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold tracking-tight mb-3">Upload BPD File</h2>
                          <p className="text-[#1A1A1A]/40 max-w-sm mx-auto leading-relaxed text-sm font-medium">
                            Select an Excel file to extract logic from Screen, Assessment, Review, and Interview tabs.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {error && (
                    <div className="mt-8 p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                      <X size={14} /> {error}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-white border border-[#1A1A1A]/5 shadow-sm">
                  <FileSearch className="w-6 h-6 mb-4 text-[#1A1A1A]" />
                  <h3 className="font-bold text-sm mb-2 uppercase tracking-tight">Post-Header Logic</h3>
                  <p className="text-xs text-[#1A1A1A]/40 leading-relaxed font-medium">Extraction starts automatically after detecting the 'If' header in Column B.</p>
                </div>
                <div className="p-8 rounded-3xl bg-white border border-[#1A1A1A]/5 shadow-sm">
                  <Filter className="w-6 h-6 mb-4 text-[#1A1A1A]" />
                  <h3 className="font-bold text-sm mb-2 uppercase tracking-tight">Smart Context</h3>
                  <p className="text-xs text-[#1A1A1A]/40 leading-relaxed font-medium">View conditions unique to each tab or a global unique list across states.</p>
                </div>
              </div>
            </motion.div>
          ) : loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-[#1A1A1A]/5 rounded-full animate-spin border-t-[#1A1A1A]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-[#1A1A1A]/20" />
                </div>
              </div>
              <p className="mt-8 text-[10px] font-black tracking-[0.4em] uppercase opacity-40">Running Extraction Protocol...</p>
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-[#1A1A1A]/5 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 flex-1">
                  <div className="relative flex-1 max-w-sm w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1A1A1A]/20 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Filter logic..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A]/[0.02] border border-[#1A1A1A]/5 rounded-2xl text-[13px] focus:outline-none focus:ring-4 focus:ring-[#1A1A1A]/5 transition-all font-mono font-medium"
                    />
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-[#1A1A1A]/[0.02] p-1.5 rounded-2xl border border-[#1A1A1A]/5 max-w-[400px] overflow-x-auto no-scrollbar">
                    {['All', ...allTabs].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTabFilter(tab)}
                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all whitespace-nowrap
                          ${activeTabFilter === tab ? 'bg-white text-[#1A1A1A] shadow-md ring-1 ring-black/5' : 'text-[#1A1A1A]/30 hover:text-[#1A1A1A]'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end lg:self-center">
                  <div className="px-5 py-3 bg-[#1A1A1A] rounded-2xl flex items-center gap-3 shadow-lg shadow-black/10">
                    <Hash size={14} className="text-white/40" />
                    <span className="text-white font-mono text-sm font-bold leading-none">{filteredResults.length}</span>
                    <div className="w-[1px] h-3 bg-white/10" />
                    <span className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Unique</span>
                  </div>

                  <div className="px-5 py-3 bg-white border border-[#1A1A1A]/10 rounded-2xl flex items-center gap-3 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[#1A1A1A] font-mono text-sm font-bold leading-none">{stepCount}</span>
                    <div className="w-[1px] h-3 bg-[#1A1A1A]/10" />
                    <span className="text-[#1A1A1A]/30 text-[9px] font-black uppercase tracking-widest leading-none">Steps Found</span>
                  </div>
                  
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-3 px-6 py-3 bg-white border border-[#1A1A1A]/10 rounded-2xl hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-all group active:scale-95"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 size={16} className="text-green-500" />
                        <span className="text-xs font-bold uppercase tracking-tight">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} className="text-[#1A1A1A]/40 group-hover:text-white" />
                        <span className="text-xs font-bold uppercase tracking-tight">Copy List</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-[#1A1A1A]/5 shadow-2xl overflow-hidden shadow-black/[0.02]">
                <div className="grid grid-cols-[100px_1fr_140px] px-8 py-5 border-b border-[#1A1A1A]/5 bg-[#FAFAFA]">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]/20">Status</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]/20">Logic Declaration</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]/20 text-right">Context</span>
                </div>
                
                <div className="divide-y divide-[#1A1A1A]/[0.03] max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {filteredResults.length > 0 ? filteredResults.map((item, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(idx * 0.005, 0.5) }}
                      className="grid grid-cols-[100px_1fr_140px] px-8 py-5 hover:bg-[#1A1A1A]/[0.01] transition-colors items-center group relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div>
                        <span className="px-2 py-1 bg-green-50 text-green-600 text-[8px] font-black uppercase tracking-tighter rounded border border-green-100">STABLE</span>
                      </div>
                      <div className="font-mono text-[13px] text-[#1A1A1A]/80 leading-relaxed break-words pr-12 group-hover:text-[#1A1A1A] transition-colors">
                        {item.condition}
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 bg-[#1A1A1A]/[0.02] border border-[#1A1A1A]/10 rounded-xl text-[9px] font-black text-[#1A1A1A]/40 uppercase tracking-widest">
                          {item.tab}
                        </span>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="py-32 text-center">
                      <div className="w-16 h-16 bg-[#1A1A1A]/[0.02] rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileSpreadsheet className="w-8 h-8 text-[#1A1A1A]/10" />
                      </div>
                      <p className="text-xs text-[#1A1A1A]/20 font-black uppercase tracking-[0.2em]">Zero conditions found in scope</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 py-8 border-t border-[#1A1A1A]/5">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-2xl border-4 border-[#FDFCFB] bg-[#1A1A1A]/5 flex items-center justify-center overflow-hidden" />
                  ))}
                </div>
                <div className="flex flex-col">
                  <p className="text-[9px] font-black text-[#1A1A1A]/20 uppercase tracking-[0.3em]">BPD Logic Parser v2.1.0 // Hash Verified</p>
                  <p className="text-[8px] font-bold text-[#1A1A1A]/10 uppercase tracking-tighter mt-0.5">Automated screening protocols active</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.04);
          border-radius: 20px;
          border: 2px solid #FDFCFB;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.08);
        }
      `}</style>
    </div>
  );
}

