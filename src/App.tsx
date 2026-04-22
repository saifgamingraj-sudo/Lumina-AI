/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Download, 
  FileVideo, 
  Layers, 
  Loader2, 
  Settings2, 
  Sparkles, 
  Upload, 
  X,
  Zap
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';

// --- Constants & Types ---

const FFMPEG_CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

interface ProcessingLog {
  message: string;
  type: 'info' | 'error' | 'success';
  timestamp: string;
}

// --- App Component ---

export default function App() {
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [enhancementLevel, setEnhancementLevel] = useState(50);
  const [targetResolution, setTargetResolution] = useState('1080');

  const logEndRef = useRef<HTMLDivElement>(null);

  // Initialize FFmpeg
  useEffect(() => {
    async function load() {
      const instance = new FFmpeg();
      
      instance.on('log', ({ message }) => {
        addLog(message, 'info');
      });

      instance.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      try {
        const coreURL = await toBlobURL(`${FFMPEG_CORE_URL}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${FFMPEG_CORE_URL}/ffmpeg-core.wasm`, 'application/wasm');
        
        await instance.load({
          coreURL,
          wasmURL,
        });

        setFfmpeg(instance);
        addLog('Lumina Engine initialized and ready.', 'success');
      } catch (err) {
        addLog('Failed to load Lumina Engine. Check SharedArrayBuffer headers.', 'error');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, {
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }].slice(-50)); // Keep last 50 logs
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.[0]) {
      setVideoFile(acceptedFiles[0]);
      setResultUrl(null);
      setProgress(0);
      addLog(`File loaded: ${acceptedFiles[0].name} (${(acceptedFiles[0].size / (1024 * 1024)).toFixed(2)} MB)`, 'info');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [] },
    multiple: false,
  } as any);

  const handleProcess = async () => {
    if (!ffmpeg || !videoFile) return;

    setProcessing(true);
    setProgress(0);
    setResultUrl(null);
    addLog('Starting enhancement process...', 'info');

    try {
      const fileName = videoFile.name;
      const outputName = `enhanced_${fileName.split('.')[0]}.mp4`;
      
      await ffmpeg.writeFile(fileName, await fetchFile(videoFile));

      // Calculate sharpening parameters based on enhancementLevel
      // unsharp algorithm: luma_matrix_width:luma_matrix_height:luma_amount
      const sharpAmount = (enhancementLevel / 50).toFixed(1);
      
      // Upscaling logic: scale=w:h
      // We aim for targetResolution (e.g., 1080p height) while preserving aspect ratio
      const scaleFilter = `scale=-2:${targetResolution}`;
      const unsharpFilter = `unsharp=5:5:${sharpAmount}:5:5:0.0`;
      const filterChain = `${scaleFilter},${unsharpFilter}`;

      addLog(`Applying filters: ${filterChain}`, 'info');

      await ffmpeg.exec([
        '-i', fileName,
        '-vf', filterChain,
        '-c:v', 'libx264',
        '-preset', 'ultrafast', // Speed over compression for demo
        '-crf', '23',
        '-c:a', 'copy',
        outputName
      ]);

      const data = await ffmpeg.readFile(outputName);
      const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'video/mp4' }));
      
      setResultUrl(url);
      addLog('Enhancement complete. Ready for download.', 'success');
    } catch (err) {
      addLog('Error during processing. See console for details.', 'error');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setVideoFile(null);
    setResultUrl(null);
    setProgress(0);
    addLog('System reset.', 'info');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05060f] flex items-center justify-center text-white font-sans">
        <div className="mesh-bg" />
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 animate-pulse">
            <Zap className="w-8 h-8 text-indigo-500 fill-current shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight glow-text mb-1">Lumina AI</h2>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Initializing Neural Core...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-indigo-500/30 p-6 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="mesh-bg" />
      
      {/* Navigation Header */}
      <nav className="glass-panel px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <Zap className="w-5 h-5 text-white fill-current" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">LUMINA<span className="text-indigo-400">AI</span></h1>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">Enhancement Engine</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <span className="text-white">Enhancer</span>
          <span className="hover:text-white cursor-pointer transition-colors">Upscaler</span>
          <span className="hover:text-white cursor-pointer transition-colors">API</span>
          <span className="hover:text-white cursor-pointer transition-colors">Pricing</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-tighter">System: Optimal</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">Latency: 12ms</span>
          </div>
          <button className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20">
            Sign In
          </button>
        </div>
      </nav>

      <main className="flex-1 grid grid-cols-12 gap-6">
        {/* Left Column: Processing Area */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <section className="glass-panel flex-1 flex flex-col overflow-hidden">
            <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center transition-all
              ${!videoFile ? 'upload-zone cursor-pointer' : ''}
            `}
            {...(!videoFile ? getRootProps() : {})}
            >
              {!videoFile ? (
                <>
                  <input {...getInputProps()} />
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mb-8 border border-white/5"
                  >
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-indigo-400" />
                    </div>
                  </motion.div>
                  <h2 className="text-4xl font-bold text-white mb-3 glow-text tracking-tight">Ready to Upscale?</h2>
                  <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                    Drag and drop your video file here. Lumina utilizes neural sharpening and bicubic upscaling to restore details.
                  </p>
                  <div className="flex gap-4">
                    <button className="px-8 py-3 bg-white text-black rounded-2xl font-bold hover:bg-slate-100 transition-all hover:scale-[1.02] shadow-xl">
                      Select Files
                    </button>
                    <button className="px-8 py-3 glass-card text-white font-bold hover:bg-white/10 transition-all">
                      Cloud Import
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex-1 flex flex-col items-center justify-center py-4 px-8">
                  <div className="w-full h-full max-h-[500px] aspect-video bg-black/40 rounded-3xl relative overflow-hidden group border border-white/10 shadow-2xl flex items-center justify-center">
                    <FileVideo className="w-24 h-24 text-indigo-500/20" />
                    <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm font-medium text-slate-400 glass-card px-4 py-2">
                      {videoFile.name}
                    </p>
                    
                    <button 
                      onClick={reset} 
                      className="absolute top-6 right-6 w-10 h-10 glass-card flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                      {processing && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-indigo-950/40 backdrop-blur-md flex flex-col items-center justify-center p-12"
                        >
                          <Loader2 className="w-16 h-16 text-indigo-400 animate-spin mb-8" />
                          <div className="w-full max-w-md px-8 py-6 glass-panel flex flex-col items-center">
                            <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-4">Enhancing Master Frame</span>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
                              <motion.div 
                                className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-2xl font-black text-white glow-text">{progress}%</span>
                          </div>
                        </motion.div>
                      )}

                      {resultUrl && !processing && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center backdrop-blur-lg bg-indigo-500/10"
                        >
                          <div className="flex flex-col items-center gap-6">
                            <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-bounce-subtle">
                              <Download className="w-12 h-12 text-white" />
                            </div>
                            <div className="text-center">
                              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Processing Complete</h3>
                              <a
                                href={resultUrl}
                                download={`enhanced_${videoFile.name}`}
                                className="inline-block px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                              >
                                DOWNLOAD FILE
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 glass-card mx-8 mb-8 flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Neural Engine</div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-bold border border-indigo-500/20 uppercase">HyperRes V2.1</span>
                  <span className="px-3 py-1 bg-white/5 text-slate-400 rounded-lg text-[10px] font-bold border border-white/5 uppercase">Denoise AI</span>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                <p>Engine Load: <span className="text-emerald-400">Low</span></p>
                <p>Throughput: <span className="text-white">~120 FPS</span></p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Settings & History */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <section className="glass-panel p-8 flex flex-col gap-8">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Optimization Settings</h3>
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Target Resolution</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['720', '1080', '1440'].map(res => (
                      <button
                        key={res}
                        onClick={() => setTargetResolution(res)}
                        disabled={processing}
                        className={`p-4 rounded-2xl text-xs font-bold text-left transition-all border
                          ${targetResolution === res 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                            : 'glass-card border-white/5 text-slate-400 hover:bg-white/10'}
                        `}
                      >
                        <div className="flex justify-between items-center">
                          <span>{res === '720' ? 'HD' : res === '1080' ? 'FULL HD' : '2K QHD'}</span>
                          <span className={`${targetResolution === res ? 'text-indigo-200' : 'text-slate-600'}`}>{res}p</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Sharpening Level</label>
                    <span className="text-[10px] font-mono text-indigo-400">{enhancementLevel}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={enhancementLevel} 
                    onChange={(e) => setEnhancementLevel(Number(e.target.value))}
                    disabled={processing}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[8px] text-slate-600 font-black uppercase tracking-[0.2em]">
                    <span>Soft</span>
                    <span>Medium</span>
                    <span>Aggressive</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleProcess}
                    disabled={processing || !videoFile}
                    className="w-full py-5 bg-indigo-600 rounded-2xl text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/30 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-3"
                  >
                    {processing ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> ENHANCING...</>
                    ) : (
                      <><Sparkles className="w-5 h-5" /> Enhance Video</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel flex-1 flex flex-col overflow-hidden min-h-[300px]">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Activity Logs</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[9px] scroll-smooth">
              {logs.length === 0 && (
                <div className="h-full flex items-center justify-center text-slate-600 uppercase tracking-widest">
                  System Standby...
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 leading-relaxed p-2 rounded-lg border border-transparent transition-colors hover:bg-white/[0.02] 
                  ${log.type === 'error' ? 'bg-red-500/5' : ''}
                  ${log.type === 'success' ? 'bg-emerald-500/5' : ''}
                `}>
                  <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                  <span className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'success' ? 'text-emerald-400' : ''}
                    ${log.type === 'info' ? 'text-slate-400' : ''}
                  `}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </section>
        </div>
      </main>

      <footer className="py-2 flex items-center justify-between text-slate-600">
        <p className="text-[9px] font-black uppercase tracking-[0.3em]">
          &copy; 2026 LUMINA SYSTEMS // NEURAL_GRID_ACTIVE
        </p>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Processing Node: HK-01</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
