/**
 * Soft, multi-layered pastel gradient blur field used behind every screen.
 * Purely decorative; all values come from design tokens.
 */
import bg1 from "@/assets/bg-1.jpg.asset.json";
import bg2 from "@/assets/bg-2.jpg.asset.json";
import bg3 from "@/assets/bg-3.jpg.asset.json";
import bg4 from "@/assets/bg-4.jpg.asset.json";
import bg5 from "@/assets/bg-5.jpg.asset.json";
import bg6 from "@/assets/bg-6.jpg.asset.json";
import bg7 from "@/assets/bg-7.jpg.asset.json";
import bg8 from "@/assets/bg-8.jpg.asset.json";

const ART = [
  { src: bg1.url, className: "left-[-6%] top-[2%] w-[38vw] max-w-[320px] rotate-[-6deg]" },
  { src: bg2.url, className: "right-[-4%] top-[6%] w-[34vw] max-w-[300px] rotate-[5deg]" },
  { src: bg8.url, className: "left-[8%] top-[38%] w-[30vw] max-w-[260px] rotate-[3deg]" },
  { src: bg4.url, className: "right-[6%] top-[40%] w-[28vw] max-w-[240px] rotate-[-4deg]" },
  { src: bg7.url, className: "left-[-4%] bottom-[2%] w-[32vw] max-w-[280px] rotate-[4deg]" },
  { src: bg6.url, className: "right-[-6%] bottom-[0%] w-[36vw] max-w-[300px] rotate-[-5deg]" },
  { src: bg3.url, className: "left-[38%] top-[-8%] w-[26vw] max-w-[220px] rotate-[2deg]" },
  { src: bg5.url, className: "left-[42%] bottom-[-6%] w-[26vw] max-w-[220px] rotate-[-3deg]" },
];

export function AuroraField() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      {/* anime art collage */}
      <div
        className="absolute inset-0 opacity-70"
        style={{ maskImage: "radial-gradient(ellipse at 50% 45%, transparent 18%, black 85%)" }}
      >
        {ART.map((art) => (
          <img
            key={art.src}
            src={art.src}
            alt=""
            loading="lazy"
            className={`absolute rounded-[2rem] saturate-110 ${art.className}`}
          />
        ))}
      </div>
      <div className="bg-background/35 absolute inset-0" />



      <div
        className="animate-aurora absolute -top-[22%] -left-[14%] h-[70vh] w-[70vh] rounded-full opacity-55 blur-[130px]"
        style={{ background: "radial-gradient(circle, var(--pastel-lilac), transparent 68%)" }}
      />
      <div
        className="animate-aurora absolute top-[8%] right-[-16%] h-[62vh] w-[62vh] rounded-full opacity-45 blur-[140px]"
        style={{
          background: "radial-gradient(circle, var(--neon-cyan), transparent 66%)",
          animationDelay: "-8s",
        }}
      />
      <div
        className="animate-aurora absolute bottom-[-22%] left-[18%] h-[76vh] w-[76vh] rounded-full opacity-40 blur-[150px]"
        style={{
          background: "radial-gradient(circle, var(--neon-pink), transparent 64%)",
          animationDelay: "-15s",
        }}
      />
      <div
        className="animate-aurora absolute bottom-[6%] right-[8%] h-[48vh] w-[48vh] rounded-full opacity-35 blur-[120px]"
        style={{
          background: "radial-gradient(circle, var(--pastel-mint), transparent 70%)",
          animationDelay: "-4s",
        }}
      />

      {/* fine grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--pastel-lilac) 1px, transparent 1px), linear-gradient(90deg, var(--pastel-lilac) 1px, transparent 1px)",
          backgroundSize: "68px 68px",
          maskImage: "radial-gradient(ellipse at 50% 20%, black, transparent 78%)",
        }}
      />

      {/* drifting motes */}
      {[
        { left: "12%", top: "28%", size: 6, delay: "0s" },
        { left: "78%", top: "18%", size: 4, delay: "-2s" },
        { left: "62%", top: "62%", size: 7, delay: "-4s" },
        { left: "28%", top: "74%", size: 5, delay: "-6s" },
        { left: "88%", top: "48%", size: 4, delay: "-1s" },
        { left: "42%", top: "12%", size: 5, delay: "-5s" },
      ].map((mote, i) => (
        <span
          key={i}
          className="animate-drift bg-pastel-mint absolute rounded-full blur-[1px]"
          style={{
            left: mote.left,
            top: mote.top,
            width: mote.size,
            height: mote.size,
            animationDelay: mote.delay,
          }}
        />
      ))}
    </div>
  );
}
