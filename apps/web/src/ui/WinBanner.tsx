export interface WinBannerProps {
  readonly solved: boolean;
}

export function WinBanner({ solved }: WinBannerProps): JSX.Element | null {
  if (!solved) return null;
  return (
    <div
      role="status"
      style={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "10px 24px",
        background: "#2d6a4f",
        color: "#fff",
        borderRadius: 8,
        fontWeight: 600,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      🎉 Puzzle solved!
    </div>
  );
}
