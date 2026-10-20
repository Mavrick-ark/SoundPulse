'use client';

import React, { useState, useRef } from 'react';
import { X, UploadCloud, CheckCircle2, AlertCircle, FileAudio, Sparkles, Loader2 } from 'lucide-react';
import { usePlayerStore } from '@/lib/store';
import { uploadDeviceAudio } from '@/lib/api';

interface DeviceImportModalProps {
  onUploadSuccess: () => void;
}

export const DeviceImportModal: React.FC<DeviceImportModalProps> = ({ onUploadSuccess }) => {
  const { isImportModalOpen, setImportModalOpen } = usePlayerStore();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isImportModalOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const audioFiles = files.filter((f) =>
      /\.(mp3|flac|m4a|wav|aac|ogg|opus)$/i.test(f.name) || f.type.startsWith('audio/')
    );
    if (audioFiles.length === 0) {
      setErrorMsg('Please select valid audio files (.mp3, .flac, .wav, .m4a, .aac).');
      return;
    }
    setErrorMsg(null);
    setSelectedFiles(audioFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setErrorMsg(null);
    setUploadStatus('Importing audio files into SoundPulse lossless library...');

    try {
      const res = await uploadDeviceAudio(selectedFiles);
      if (res.error) {
        throw new Error(res.error);
      }
      setUploadStatus(`Successfully imported ${selectedFiles.length} song(s)! Auto-enriching lyrics & art...`);
      setTimeout(() => {
        setIsUploading(false);
        setSelectedFiles([]);
        setUploadStatus(null);
        setImportModalOpen(false);
        onUploadSuccess();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload audio files');
      setIsUploading(false);
      setUploadStatus(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-[#0e101a] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Import from Device</h3>
              <p className="text-xs text-neutral-400">Add local audio files to your SoundPulse library</p>
            </div>
          </div>
          <button
            onClick={() => setImportModalOpen(false)}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-5 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.02]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.flac,.wav,.m4a,.aac,.ogg"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center mb-3">
            <FileAudio className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-white">
            Click to browse or drag and drop audio files
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Supports FLAC, MP3, WAV, M4A, AAC (Lossless & High-Res)
          </p>
        </div>

        {/* Error or Status message */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {uploadStatus && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2 text-xs text-indigo-300">
            {isUploading ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{uploadStatus}</span>
          </div>
        )}

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
              <span>Selected Files ({selectedFiles.length})</span>
              <span>
                Total:{' '}
                {formatFileSize(selectedFiles.reduce((acc, f) => acc + f.size, 0))}
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/[0.04] text-xs text-neutral-200"
                >
                  <span className="truncate max-w-[280px] font-medium">{file.name}</span>
                  <span className="text-neutral-400 shrink-0">{formatFileSize(file.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={() => setImportModalOpen(false)}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/30 transition-all duration-200"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Import {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
