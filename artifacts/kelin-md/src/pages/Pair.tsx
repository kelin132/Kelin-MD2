import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRequestPairing, useGetBotStatus } from "@workspace/api-client-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Smartphone, RefreshCcw, Copy, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const formSchema = z.object({
  phoneNumber: z.string().min(8, "Phone number must be at least 8 digits").regex(/^\+?[0-9]+$/, "Must contain only numbers and optional leading +")
});

export default function PairPage() {
  const { data: status } = useGetBotStatus({ query: { refetchInterval: 2000 } });
  const requestPairing = useRequestPairing();
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-update pairing code if it changes in status
  useEffect(() => {
    if (status?.pairingCode) {
      setPairingCode(status.pairingCode);
    }
  }, [status?.pairingCode]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { phoneNumber: "" }
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    requestPairing.mutate(
      { data: { phoneNumber: values.phoneNumber } },
      {
        onSuccess: (res) => {
          setPairingCode(res.pairingCode);
        }
      }
    );
  };

  const copyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status?.connected) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center flex flex-col items-center gap-4 border-primary/30">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mb-2 shadow-[0_0_30px_rgba(0,212,255,0.2)]">
            <CheckCircle2 size={40} className="text-primary" />
          </div>
          <h2 className="text-2xl font-mono text-white tracking-tight">SYSTEM CONNECTED</h2>
          <p className="text-muted-foreground font-mono text-sm">
            Device +{status.connectedNumber} is successfully paired and active.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-mono font-bold text-white tracking-tight mb-2">DEVICE PAIRING</h1>
        <p className="text-muted-foreground font-mono text-sm max-w-xl">
          Connect KELIN MD to your WhatsApp account without scanning a QR code. 
          Enter your phone number to generate an 8-character pairing code.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Form Section */}
        <GlassCard className="p-6 border-white/10">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-mono text-primary tracking-widest uppercase">Target Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  {...form.register("phoneNumber")}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="+1234567890"
                  disabled={requestPairing.isPending || !!pairingCode}
                />
              </div>
              {form.formState.errors.phoneNumber && (
                <p className="text-destructive text-xs font-mono">{form.formState.errors.phoneNumber.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={requestPairing.isPending || !!pairingCode}
              className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 px-4 py-3 rounded-lg font-mono text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(0,212,255,0.1)] hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {requestPairing.isPending ? (
                <><RefreshCcw className="animate-spin w-4 h-4" /> GENERATING...</>
              ) : (
                "REQUEST CODE"
              )}
            </button>
          </form>

          {pairingCode && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <button 
                onClick={() => setPairingCode(null)}
                className="text-xs font-mono text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
              >
                <RefreshCcw size={12} /> request new code
              </button>
            </div>
          )}
        </GlassCard>

        {/* Display Section */}
        <div className="flex flex-col items-center justify-center">
          {pairingCode ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full"
            >
              <GlassCard className="p-8 flex flex-col items-center justify-center text-center relative overflow-hidden border-secondary/40 shadow-[0_0_40px_rgba(124,58,237,0.15)]">
                <div className="absolute inset-0 bg-secondary/5 pointer-events-none" />
                <h3 className="text-sm font-mono text-secondary mb-6 tracking-widest uppercase">Your Pairing Code</h3>
                
                <div className="flex gap-2 sm:gap-3 mb-8">
                  {pairingCode.split('').map((char, i) => (
                    char === '-' ? (
                      <div key={i} className="w-4 flex items-center justify-center text-white/50">-</div>
                    ) : (
                      <div key={i} className="w-10 sm:w-12 h-14 sm:h-16 rounded bg-black/60 border border-secondary/50 flex items-center justify-center text-2xl sm:text-3xl font-mono font-bold text-white shadow-[inset_0_0_15px_rgba(124,58,237,0.3)]">
                        {char}
                      </div>
                    )
                  ))}
                </div>

                <button 
                  onClick={copyCode}
                  className="flex items-center gap-2 text-sm font-mono bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded transition-all"
                >
                  {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                  {copied ? "COPIED TO CLIPBOARD" : "COPY CODE"}
                </button>
              </GlassCard>
              
              <div className="mt-6 text-sm text-muted-foreground font-mono bg-white/5 p-4 rounded border border-white/5">
                <p className="flex items-start gap-2">
                  <span className="text-secondary mt-0.5">&gt;</span>
                  Open WhatsApp on your phone
                </p>
                <p className="flex items-start gap-2 mt-2">
                  <span className="text-secondary mt-0.5">&gt;</span>
                  Tap Menu or Settings and select Linked Devices
                </p>
                <p className="flex items-start gap-2 mt-2">
                  <span className="text-secondary mt-0.5">&gt;</span>
                  Tap Link a Device, then "Link with phone number instead"
                </p>
                <p className="flex items-start gap-2 mt-2">
                  <span className="text-secondary mt-0.5">&gt;</span>
                  Enter the 8-character code above
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 opacity-50 border border-dashed border-white/10 rounded-xl">
              <Smartphone size={48} className="text-muted-foreground mb-4" />
              <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Awaiting Number Input</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
