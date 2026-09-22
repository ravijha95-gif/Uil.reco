import React, { useState } from "react";
import { BalanceSummary } from "../types";
import { formatCurrency, formatSignedCurrency, formatDateShort } from "../utils/dateAndNumber";
import {
  Scale,
  Info,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Receipt,
  CreditCard,
  Percent,
  Sliders,
  ShieldBan,
} from "lucide-react";

interface BalanceReconciliationCardProps {
  balance: BalanceSummary;
}

export const BalanceReconciliationCard: React.FC<BalanceReconciliationCardProps> = ({
  balance,
}) => {
  const [isMovementExpanded, setIsMovementExpanded] = useState<boolean>(true);

  const {
    vendorOpen,
    buyerOpen,
    vendorClose,
    buyerClose,
    vendorMovement,
    buyerMovement,
    netMovementDiff,
    closingDiff,
    breakup,
  } = balance;

  const vOpenSigned = vendorOpen ? (vendorOpen.side === "Dr" ? 1 : -1) * vendorOpen.amount : 0;
  const bOpenSigned = buyerOpen ? (buyerOpen.side === "Cr" ? -1 : 1) * buyerOpen.amount : 0;
  const netOpenVariance = vOpenSigned + bOpenSigned;

  const isMovementBalanced = Math.abs(netMovementDiff) <= 1.0;
  const isClosingBalanced = Math.abs(closingDiff) <= 1.0;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Scale className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              General Ledger Balance Reconciliation Statement
            </h3>
            <p className="text-xs text-slate-500">
              Opening balance alignment, periodic movements, and derived closing position
            </p>
          </div>
        </div>

        <div>
          {isClosingBalanced ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Closing Position Balanced
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              Net Closing Variance: {formatCurrency(closingDiff)}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200/60 text-slate-600 font-semibold uppercase tracking-wider">
              <th className="py-3 px-5">Reconciliation Component</th>
              <th className="py-3 px-5">Vendor Ledger (Tally)</th>
              <th className="py-3 px-5">Buyer Ledger (SAP FBL1N)</th>
              <th className="py-3 px-5 text-right">Net Variance (₹)</th>
              <th className="py-3 px-5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {/* Opening Balance */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-3.5 px-5 font-semibold text-slate-800">
                Opening Balance
                {vendorOpen?.date && (
                  <span className="block text-[11px] font-normal text-slate-500">
                    As of {formatDateShort(vendorOpen.date)}
                  </span>
                )}
              </td>
              <td className="py-3.5 px-5 font-mono text-slate-700">
                {vendorOpen ? (
                  <>
                    <span className="font-semibold">{formatCurrency(vendorOpen.amount)}</span>{" "}
                    <span className="text-[11px] font-bold text-slate-500">{vendorOpen.side}</span>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3.5 px-5 font-mono text-slate-700">
                {buyerOpen ? (
                  <>
                    <span className="font-semibold">{formatCurrency(buyerOpen.amount)}</span>{" "}
                    <span className="text-[11px] font-bold text-slate-500">{buyerOpen.side}</span>
                    {buyerOpen.count && buyerOpen.count > 1 && (
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({buyerOpen.count} entries)
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3.5 px-5 font-mono text-right font-semibold">
                <span
                  className={
                    Math.abs(netOpenVariance) <= 1.0 ? "text-emerald-600" : "text-rose-600"
                  }
                >
                  {formatCurrency(netOpenVariance)}
                </span>
              </td>
              <td className="py-3.5 px-5 text-center">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                    Math.abs(netOpenVariance) <= 1.0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {Math.abs(netOpenVariance) <= 1.0 ? "Aligned" : "Discrepancy"}
                </span>
              </td>
            </tr>

            {/* Net Movement Header Row */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/20">
              <td className="py-3.5 px-5 font-semibold text-slate-800">
                <div className="flex items-center justify-between">
                  <span>Period Movement (Signed Net)</span>
                  {breakup && (
                    <button
                      type="button"
                      onClick={() => setIsMovementExpanded(!isMovementExpanded)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    >
                      {isMovementExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Collapse Break-up
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          View Break-up
                        </>
                      )}
                    </button>
                  )}
                </div>
                <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                  Total in-period invoices minus payments
                </span>
              </td>
              <td className="py-3.5 px-5 font-mono text-slate-700">
                <span className="font-semibold">{formatSignedCurrency(vendorMovement)}</span>
              </td>
              <td className="py-3.5 px-5 font-mono text-slate-700">
                <span className="font-semibold">{formatSignedCurrency(buyerMovement)}</span>
              </td>
              <td className="py-3.5 px-5 font-mono text-right font-semibold">
                <span className={isMovementBalanced ? "text-emerald-600" : "text-rose-600"}>
                  {formatCurrency(netMovementDiff)}
                </span>
              </td>
              <td className="py-3.5 px-5 text-center">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                    isMovementBalanced
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {isMovementBalanced ? "Reconciled" : "Variance"}
                </span>
              </td>
            </tr>

            {/* Expanded Breakdown Rows under Period Movement */}
            {isMovementExpanded && breakup && (
              <>
                {/* 1. Total Invoices */}
                <tr className="bg-slate-50/60 border-l-2 border-indigo-400 text-slate-700">
                  <td className="py-2.5 pl-9 pr-5 text-[11.5px]">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-semibold text-slate-800">1. Total Invoices Booked</span>
                      <span className="text-[10px] text-slate-400">
                        ({breakup.invoices.vendorCount} Tally / {breakup.invoices.buyerCount} SAP)
                      </span>
                    </div>
                    <span className="block text-[10.5px] text-slate-500 pl-5.5">
                      Vendor sales debits vs SAP vendor invoice credits (KR/RE)
                    </span>
                  </td>
                  <td className="py-2.5 px-5 font-mono text-[11.5px]">
                    {formatCurrency(breakup.invoices.vendorAmount)}
                  </td>
                  <td className="py-2.5 px-5 font-mono text-[11.5px]">
                    {formatCurrency(breakup.invoices.buyerAmount)}
                  </td>
                  <td className="py-2.5 px-5 font-mono text-right text-[11.5px] font-medium">
                    <span className={breakup.invoices.status === "Aligned" ? "text-emerald-600" : "text-rose-600"}>
                      {formatCurrency(breakup.invoices.variance)}
                    </span>
                  </td>
                  <td className="py-2.5 px-5 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        breakup.invoices.status === "Aligned"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {breakup.invoices.status}
                    </span>
                  </td>
                </tr>

                {/* 2. Total Payments & Receipts (Includes Net of Hold) */}
                <tr className="bg-slate-50/60 border-l-2 border-emerald-400 text-slate-700">
                  <td className="py-2.5 pl-9 pr-5 text-[11.5px]">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-semibold text-slate-800">2. Total Payments & Receipts</span>
                      <span className="text-[10px] text-slate-400">
                        ({breakup.payments.vendorCount} Tally / {breakup.payments.buyerCount} SAP)
                      </span>
                    </div>
                    <span className="block text-[10.5px] text-slate-500 pl-5.5">
                      Vendor bank receipts vs SAP net payment disbursements (Dr less hold Cr)
                    </span>
                  </td>
                  <td className="py-2.5 px-5 font-mono text-[11.5px]">
                    {formatCurrency(breakup.payments.vendorAmount)}
                  </td>
                  <td className="py-2.5 px-5 font-mono text-[11.5px]">
                    {formatCurrency(breakup.payments.buyerAmount)}
                  </td>
                  <td className="py-2.5 px-5 font-mono text-right text-[11.5px] font-medium">
                    <span className={breakup.payments.status === "Aligned" ? "text-emerald-600" : "text-rose-600"}>
                      {formatCurrency(breakup.payments.variance)}
                    </span>
                  </td>
                  <td className="py-2.5 px-5 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        breakup.payments.status === "Aligned"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {breakup.payments.status}
                    </span>
                  </td>
                </tr>

                {/* 3. Statutory TDS Deductions */}
                <tr className="bg-slate-50/60 border-l-2 border-amber-400 text-slate-700">
                  <td className="py-2.5 pl-9 pr-5 text-[11.5px]">
                    <div className="flex items-center gap-2">
                      <Percent className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-semibold text-slate-800">3. Statutory TDS Deductions</span>
                      <span className="text-[10px] text-slate-400">
                        ({breakup.tds.buyerCount} SAP tax lines)
                      </span>
                    </div>
                    <span className="block text-[10.5px] text-slate-500 pl-5.5">
                      Withholding tax booked under Section 194J (10%), 194C (1%/2%), or 194Q (0.1%)
                    </span>
                  </td>
                  <td className="py-2.5 px-5 font-mono text-[11.5px]">
                    {breakup.tds.vendorAmount > 0 ? formatCurrency(breakup.tds.vendorAmount) : "—"}
                  </td>
                  <td className="py-2.5 px-5 font-mono text-[11.5px]">
                    {formatCurrency(breakup.tds.buyerAmount)}
                  </td>
                  <td className="py-2.5 px-5 font-mono text-right text-[11.5px] font-medium">
                    <span className={breakup.tds.status === "Aligned" ? "text-emerald-600" : "text-amber-600"}>
                      {formatCurrency(breakup.tds.variance)}
                    </span>
                  </td>
                  <td className="py-2.5 px-5 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        breakup.tds.status === "Aligned"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {breakup.tds.status === "Aligned" ? "Aligned" : "Tax Withheld"}
                    </span>
                  </td>
                </tr>

                {/* 4. Other Adjustments (Credit/Debit Notes, JVs) */}
                <tr className="bg-slate-50/60 border-l-2 border-sky-400 text-slate-700">
                  <td className="py-2.5 pl-9 pr-5 text-[11.5px]">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-sky-500" />
                      <span className="font-semibold text-slate-800">4. Other Adjustments & Notes</span>
                      <span className="text-[10px] text-slate-400">
                        ({breakup.adjustments.vendorCount} Tally / {breakup.adjustments.buyerCount} SAP)
                      </span>
                    </div>
                    <span className="block text-[10.5px] text-slate-500 pl-5.5">
                      Credit Notes, Debit Notes, Rate Adjustments, and Journal Vouchers
                    </span>
                  </td>
                  <td className="py-2.5 px-5 font-mono text-[11.5px]">
                    {formatCurrency(breakup.adjustments.vendorAmount)}
                  </td>
                  <td className="py-2.5 px-5 font-mono text-[11.5px]">
                    {formatCurrency(breakup.adjustments.buyerAmount)}
                  </td>
                  <td className="py-2.5 px-5 font-mono text-right text-[11.5px] font-medium">
                    <span className={breakup.adjustments.status === "Aligned" ? "text-emerald-600" : "text-slate-600"}>
                      {formatCurrency(breakup.adjustments.variance)}
                    </span>
                  </td>
                  <td className="py-2.5 px-5 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        breakup.adjustments.status === "Aligned"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {breakup.adjustments.status}
                    </span>
                  </td>
                </tr>

                {/* 5. Excluded Transactions (if any exist) */}
                {breakup.excluded && (breakup.excluded.vendorCount > 0 || breakup.excluded.buyerCount > 0) && (
                  <tr className="bg-amber-50/40 border-l-2 border-amber-400 text-slate-700">
                    <td className="py-2.5 pl-9 pr-5 text-[11.5px]">
                      <div className="flex items-center gap-2">
                        <ShieldBan className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-semibold text-slate-800">5. Excluded from Reconciliation</span>
                        <span className="text-[10px] text-amber-700">
                          ({breakup.excluded.vendorCount} Tally / {breakup.excluded.buyerCount} SAP excluded)
                        </span>
                      </div>
                      <span className="block text-[10.5px] text-slate-500 pl-5.5">
                        Transactions marked as excluded or rule-filtered from reconciliation pool
                      </span>
                    </td>
                    <td className="py-2.5 px-5 font-mono text-[11.5px]">
                      {formatCurrency(breakup.excluded.vendorAmount)}
                    </td>
                    <td className="py-2.5 px-5 font-mono text-[11.5px]">
                      {formatCurrency(breakup.excluded.buyerAmount)}
                    </td>
                    <td className="py-2.5 px-5 font-mono text-right text-[11.5px] font-medium text-amber-700">
                      {formatCurrency(breakup.excluded.variance)}
                    </td>
                    <td className="py-2.5 px-5 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                        Excluded
                      </span>
                    </td>
                  </tr>
                )}
              </>
            )}

            {/* Closing Balance */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/30">
              <td className="py-3.5 px-5 font-bold text-slate-900">
                Closing Balance
                {(vendorClose?.derived || buyerClose?.derived) && (
                  <span className="block text-[11px] font-normal text-indigo-600">
                    Calculated from Opening + Net Movement
                  </span>
                )}
              </td>
              <td className="py-3.5 px-5 font-mono text-slate-800 font-bold">
                {vendorClose ? (
                  <>
                    <span>{formatCurrency(vendorClose.amount)}</span>{" "}
                    <span className="text-[11px] font-bold text-slate-500">{vendorClose.side}</span>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3.5 px-5 font-mono text-slate-800 font-bold">
                {buyerClose ? (
                  <>
                    <span>{formatCurrency(buyerClose.amount)}</span>{" "}
                    <span className="text-[11px] font-bold text-slate-500">{buyerClose.side}</span>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3.5 px-5 font-mono text-right font-bold">
                <span className={isClosingBalanced ? "text-emerald-600" : "text-rose-600"}>
                  {formatCurrency(closingDiff)}
                </span>
              </td>
              <td className="py-3.5 px-5 text-center">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                    isClosingBalanced
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {isClosingBalanced ? "Balanced (₹0)" : "Unreconciled"}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-700">Accounting Convention:</span> In the vendor's books (Tally), invoices are <strong className="text-slate-800">Debit (+)</strong> and receipts are <strong className="text-slate-800">Credit (−)</strong>. In SAP, the buyer books invoices as <strong className="text-slate-800">Credit (−)</strong> liabilities and payments as <strong className="text-slate-800">Debit (+)</strong> liquidations. When both ledgers match, the sum of signed movements equals <strong className="text-emerald-700 font-semibold">₹0.00</strong>.
        </div>
      </div>
    </div>
  );
};
