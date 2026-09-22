import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  X,
  FileText,
  Sparkles,
  HelpCircle,
  FileCode,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { downloadVendorTemplate, downloadSAPTemplate } from "../utils/excelExport";

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadVendor: (files: File[]) => void;
  onUploadBuyer: (files: File[]) => void;
  vendorFiles: File[];
  buyerFiles: File[];
  onRemoveVendorFile: (index: number) => void;
  onRemoveBuyerFile: (index: number) => void;
  onProcess: () => void;
  onLoadDemo: () => void;
  isProcessing: boolean;
  processingProgress?: string;
  errorMessage?: string | null;
  onClearError?: () => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onUploadVendor,
  onUploadBuyer,
  vendorFiles,
  buyerFiles,
  onRemoveVendorFile,
  onRemoveBuyerFile,
  onProcess,
  onLoadDemo,
  isProcessing,
  processingProgress,
  errorMessage,
  onClearError,
}) => {
  const vendorInputRef = useRef<HTMLInputElement | null>(null);
  const buyerInputRef = useRef<HTMLInputElement | null>(null);
  const [vendorDragOver, setVendorDragOver] = useState(false);
  const [buyerDragOver, setBuyerDragOver] = useState(false);

  if (!isOpen) return null;

  const canProcess = vendorFiles.length > 0 && buyerFiles.length > 0;

  const getFileBadge = (filename: string) => {
    const isPdf = filename.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
          PDF
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        EXCEL
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Import Vendor & Buyer General Ledgers
            </h2>
            <p className="text-xs text-slate-500">
              Upload Tally PDF Ledgers, SAP FBL1N PDF/Excel exports, or standardized spreadsheets
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Dual Dropzone Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Ledger (Tally) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>1. Vendor Ledger (Tally)</span>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                    PDF Supported
                  </span>
                </span>
                <button
                  onClick={downloadVendorTemplate}
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  Template
                </button>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setVendorDragOver(true);
                }}
                onDragLeave={() => setVendorDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setVendorDragOver(false);
                  if (e.dataTransfer.files.length) {
                    onUploadVendor(Array.from(e.dataTransfer.files));
                  }
                }}
                onClick={() => vendorInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  vendorDragOver
                    ? "border-indigo-500 bg-indigo-50/50"
                    : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
                }`}
              >
                <input
                  ref={vendorInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      onUploadVendor(Array.from(e.target.files));
                    }
                  }}
                />
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  Drop Tally PDF or Excel file here
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports <strong>.pdf</strong> (Native Tally), <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>
                </p>
              </div>

              {/* Uploaded Vendor Files */}
              {vendorFiles.length > 0 && (
                <div className="space-y-1 mt-2">
                  {vendorFiles.map((file, idx) => {
                    const isPdf = file.name.toLowerCase().endsWith(".pdf");
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isPdf ? (
                            <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <span className="truncate text-slate-700 font-medium">
                            {file.name}
                          </span>
                          {getFileBadge(file.name)}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveVendorFile(idx);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Buyer Ledger (SAP FBL1N) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>2. Buyer Ledger (SAP)</span>
                  <span className="text-[10px] text-sky-600 font-semibold bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100">
                    PDF / Excel
                  </span>
                </span>
                <button
                  onClick={downloadSAPTemplate}
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  Template
                </button>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setBuyerDragOver(true);
                }}
                onDragLeave={() => setBuyerDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setBuyerDragOver(false);
                  if (e.dataTransfer.files.length) {
                    onUploadBuyer(Array.from(e.dataTransfer.files));
                  }
                }}
                onClick={() => buyerInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  buyerDragOver
                    ? "border-indigo-500 bg-indigo-50/50"
                    : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
                }`}
              >
                <input
                  ref={buyerInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      onUploadBuyer(Array.from(e.target.files));
                    }
                  }}
                />
                <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  Drop SAP FBL1N PDF or Excel here
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports <strong>.pdf</strong>, <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>
                </p>
              </div>

              {/* Uploaded Buyer Files */}
              {buyerFiles.length > 0 && (
                <div className="space-y-1 mt-2">
                  {buyerFiles.map((file, idx) => {
                    const isPdf = file.name.toLowerCase().endsWith(".pdf");
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isPdf ? (
                            <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-sky-600 shrink-0" />
                          )}
                          <span className="truncate text-slate-700 font-medium">
                            {file.name}
                          </span>
                          {getFileBadge(file.name)}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveBuyerFile(idx);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-3 text-xs text-indigo-900 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
              <div className="font-medium">
                {processingProgress || "Extracting text coordinates and line items from PDF..."}
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start justify-between gap-3 text-xs text-rose-900">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-800">Error Importing Statements</div>
                  <div className="text-rose-700 mt-0.5 whitespace-pre-wrap">{errorMessage}</div>
                </div>
              </div>
              {onClearError && (
                <button
                  onClick={onClearError}
                  className="text-rose-400 hover:text-rose-700 p-1 cursor-pointer rounded"
                  title="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Tally PDF Guidance */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Native Tally & SAP PDF Extraction
            </div>
            <p>
              • <strong>Tally Ledger PDF:</strong> Direct print exports from Tally often concatenate voucher numbers and amounts (e.g. <code>K/1/24-25/18515104.00</code>). The built-in layout engine extracts the exact spatial bounding boxes, parses dates and Dr/Cr indicators, and uses SAP references as anchors to decouple numbers automatically.
            </p>
            <p>
              • <strong>SAP FBL1N PDF:</strong> Directly parses Document Number, Doc Date, Posting Date, Reference, Document Type (KR, KZ, RE, ZP), Dr/Cr indicators, and TDS Section 194 withholding taxes.
            </p>
            <p>
              • <strong>Excel & CSV:</strong> Standard spreadsheet exports are also fully supported with automatic column header detection.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={() => {
              onLoadDemo();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Load Sample Demo Data
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onProcess();
              }}
              disabled={!canProcess || isProcessing}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-40 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing PDF...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Process & Reconcile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
