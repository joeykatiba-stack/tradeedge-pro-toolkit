import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, MessageSquare, MapPin } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  message: z.string().trim().min(5).max(2000),
});

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — TradeEdge Toolkit" }, { name: "description", content: "Get in touch with the TradeEdge team." }] }),
  component: ContactPage,
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0].message);
    toast.success("Message received — we'll reply soon.");
    setForm({ name: "", email: "", message: "" });
  }
  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Get in touch</h1>
        <p className="text-muted-foreground mt-2">Questions, feature requests, or partnership inquiries — drop us a line.</p>
      </header>
      <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div className="lg:col-span-2 glass-strong rounded-2xl p-6">
          <form onSubmit={submit} className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <Button type="submit" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">Send message</Button>
          </form>
        </div>
        <div className="space-y-3">
          {[
            { icon: Mail, t: "Email", v: "hello@tradeedge.app" },
            { icon: MessageSquare, t: "Support", v: "24/7 chat available to Pro users" },
            { icon: MapPin, t: "Office", v: "Remote, worldwide" },
          ].map((i) => (
            <div key={i.t} className="glass rounded-xl p-4 flex gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg shrink-0" style={{ background: "var(--gradient-primary)" }}><i.icon className="h-5 w-5 text-white" /></div>
              <div className="min-w-0"><div className="text-xs uppercase tracking-wider text-muted-foreground">{i.t}</div><div className="text-sm font-medium truncate">{i.v}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}