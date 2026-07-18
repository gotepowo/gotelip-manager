import React from "react";

export default function CurrencyDisplay({ value, className = "", showSign = false }) {
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.abs(value || 0));

  const isNegative = (value || 0) < 0;
  const colorClass = showSign 
    ? isNegative ? "text-red-600" : "text-emerald-600"
    : "";

  return (
    <span className={`${colorClass} ${className}`}>
      {showSign && !isNegative && value > 0 ? "+" : ""}
      {isNegative ? "-" : ""}{formatted}
    </span>
  );
}