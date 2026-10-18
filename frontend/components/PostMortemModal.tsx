"use client";

import React, { useState } from "react";
import { X, Copy, Check, FileText } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
}

export default function PostMortemModal({ isOpen, onClose, markdown }: Props) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="text-blue-600" size={18} />
            <h2 className="font-bold text-slate-800 text-sm">Automated SRE Post-Mortem (INC-current)</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy Markdown"}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-500">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto">
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap">
            {markdown || "Loading post-mortem..."}
          </pre>
        </div>
      </div>
    </div>
  );
}
