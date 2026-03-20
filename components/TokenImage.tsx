"use client";

interface TokenImageProps {
  src?: string | null;
  symbol?: string;
  size?: number;
}

export default function TokenImage({ src, symbol, size = 28 }: TokenImageProps) {
  const sz = `${size}px`;

  if (!src) {
    return (
      <div
        className="rounded-full border border-[#f5a623]/20 bg-[#f5a623]/10 flex-shrink-0 flex items-center justify-center text-[10px] font-black text-[#f5a623]/50"
        style={{ width: sz, height: sz }}
      >
        {symbol?.slice(0, 2) ?? "?"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={symbol ?? ""}
      className="rounded-full border border-[#f5a623]/20 flex-shrink-0 object-cover"
      style={{ width: sz, height: sz }}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
        target.parentElement!.innerHTML = `<div style="width:${sz};height:${sz};border-radius:50%;border:1px solid rgba(245,166,35,0.2);background:rgba(245,166,35,0.1);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:rgba(245,166,35,0.5);flex-shrink:0">${symbol?.slice(0, 2) ?? "?"}</div>`;
      }}
    />
  );
}
