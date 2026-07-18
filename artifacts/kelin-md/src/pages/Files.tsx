import { useListFiles, useGetFileContent } from "@workspace/api-client-react";
import { GlassCard } from "@/components/ui/glass-card";
import { FolderOpen, FileText, FileCode, FileJson, ChevronRight, CornerDownRight, Download } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function FilesPage() {
  const [currentPath, setCurrentPath] = useState<string>(".");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  const { data: files } = useListFiles({ path: currentPath });
  const { data: fileContent, isFetching } = useGetFileContent(
    { path: selectedFile || "" },
    { query: { enabled: !!selectedFile } }
  );

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSelectedFile(null);
  };

  const navigateUp = () => {
    if (currentPath === ".") return;
    const parts = currentPath.split('/');
    parts.pop();
    handleNavigate(parts.length > 0 ? parts.join('/') : ".");
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith('.js') || name.endsWith('.ts')) return <FileCode className="text-secondary" size={16} />;
    if (name.endsWith('.json')) return <FileJson className="text-yellow-400" size={16} />;
    return <FileText className="text-white/60" size={16} />;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-mono font-bold text-white tracking-tight flex items-center gap-3">
          <FolderOpen className="text-primary" /> FILE_SYSTEM
        </h1>
      </div>

      <div className="flex gap-4 h-full min-h-0 overflow-hidden">
        {/* Explorer */}
        <GlassCard className="w-1/3 flex flex-col border-white/10 shrink-0">
          <div className="p-3 border-b border-white/10 bg-black/40 flex items-center text-sm font-mono text-white/80 overflow-x-auto hide-scrollbar shrink-0">
            <span 
              className="cursor-pointer hover:text-primary transition-colors shrink-0" 
              onClick={() => handleNavigate(".")}
            >
              root
            </span>
            {currentPath !== "." && currentPath.split('/').map((part, i, arr) => (
              <span key={i} className="flex items-center shrink-0">
                <ChevronRight size={14} className="mx-1 text-white/30" />
                <span 
                  className="cursor-pointer hover:text-primary transition-colors truncate max-w-[100px]"
                  onClick={() => handleNavigate(arr.slice(0, i + 1).join('/'))}
                >
                  {part}
                </span>
              </span>
            ))}
          </div>
          
          <ScrollArea className="flex-1 bg-[#050508]">
            <div className="p-2 space-y-1">
              {currentPath !== "." && (
                <div 
                  onClick={navigateUp}
                  className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer text-sm font-mono text-white/70 transition-colors"
                >
                  <CornerDownRight size={16} className="text-white/30 rotate-180" />
                  ..
                </div>
              )}
              
              {files?.map(f => (
                <div 
                  key={f.path}
                  onClick={() => f.type === 'directory' ? handleNavigate(f.path) : setSelectedFile(f.path)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer text-sm font-mono transition-colors ${
                    selectedFile === f.path ? 'bg-primary/20 text-white' : 'hover:bg-white/5 text-white/80'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {f.type === 'directory' ? <FolderOpen className="text-primary shrink-0" size={16} /> : getFileIcon(f.name)}
                    <span className="truncate">{f.name}</span>
                  </div>
                  <span className="text-xs text-white/30 shrink-0 ml-2">
                    {f.type === 'file' ? formatSize(f.size) : ''}
                  </span>
                </div>
              ))}
              {files?.length === 0 && (
                <div className="text-center p-4 text-xs font-mono text-white/40 italic">Empty directory</div>
              )}
            </div>
          </ScrollArea>
        </GlassCard>

        {/* Viewer */}
        <GlassCard className="flex-1 flex flex-col border-white/10 relative overflow-hidden">
          {selectedFile ? (
            <>
              <div className="p-3 border-b border-white/10 bg-black/40 flex items-center justify-between shrink-0">
                <div className="font-mono text-sm text-white/90 flex items-center gap-2 truncate">
                  {getFileIcon(selectedFile)}
                  <span className="truncate">{selectedFile.split('/').pop()}</span>
                </div>
                {fileContent && (
                  <div className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded">
                    {formatSize(fileContent.size)}
                  </div>
                )}
              </div>
              <div className="flex-1 bg-[#0a0a0f] overflow-auto relative">
                {isFetching ? (
                  <div className="absolute inset-0 flex items-center justify-center text-primary font-mono text-sm">LOADING...</div>
                ) : (
                  <pre className="p-4 text-[13px] font-mono leading-relaxed text-white/80">
                    <code>{fileContent?.content}</code>
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/20 font-mono text-sm">
              <FileCode size={48} className="mb-4 opacity-50" />
              SELECT A FILE TO VIEW
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
